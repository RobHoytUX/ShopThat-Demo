from __future__ import annotations

import logging
from typing import Optional, List

import groq
from groq import Groq
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
from langchain.llms.base import LLM
from pydantic import Field

from settings import settings

logger = logging.getLogger(__name__)

class GroqLLM(LLM):
    """LangChain-compatible text-in/text-out wrapper around Groq Chat Completions."""
    client: Groq = Field(default_factory=lambda: Groq())  # honors GROQ_API_KEY / GROQ_BASE_URL envs
    primary_model: str = settings.primary_model
    fallback_model: Optional[str] = getattr(settings, "fallback_model", None)
    temperature: float = getattr(settings, "temperature", 0.1)
    max_tokens: int = getattr(settings, "max_tokens", 600)
    system_prompt: str = getattr(settings, "system_prompt", "You are a helpful assistant.")

    @property
    def _llm_type(self) -> str:
        return "groq"

    @property
    def identifying_params(self) -> dict:
        return {
            "primary_model":  self.primary_model,
            "fallback_model": self.fallback_model,
            "temperature":    self.temperature,
            "max_tokens":     self.max_tokens,
        }

    def _create_once(self, model: str, prompt: str, stop: Optional[List[str]]) -> str:
        """Single API call."""
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user",   "content": prompt},
        ]
        resp = self.client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            stop=stop or None,  # list[str] or None
        )
        return resp.choices[0].message.content.strip()

    @retry(
        wait=wait_exponential(
            multiplier=getattr(settings, "retry_backoff_multiplier", 1),
            min=getattr(settings, "retry_backoff_min", 2),
            max=getattr(settings, "retry_backoff_max", 60),
        ),
        stop=stop_after_attempt(getattr(settings, "retry_attempts", 3)),
        # Retry on rate limits + transient network/timeouts
        retry=retry_if_exception_type(
            (groq.RateLimitError, groq.APIConnectionError, groq.APITimeoutError)
        ),
        reraise=True,
    )
    def _call(self, prompt: str, stop: Optional[List[str]] = None) -> str:
        """LangChain entry point: return a single string completion."""
        try:
            return self._create_once(self.primary_model, prompt, stop)

        except groq.APIStatusError as e:
            # Anything 4xx/5xx → try fallback if configured (and different)
            logger.warning(
                "Groq primary failed: status=%s model=%s msg=%s",
                getattr(e, "status_code", None), self.primary_model, str(e)
            )
            if self.fallback_model and self.fallback_model != self.primary_model:
                try:
                    return self._create_once(self.fallback_model, prompt, stop)
                except Exception as e2:
                    logger.error("Groq fallback failed: model=%s err=%s", self.fallback_model, e2)
                    raise
            raise

        # Let tenacity handle RateLimit/Connection/Timeout per the decorator
