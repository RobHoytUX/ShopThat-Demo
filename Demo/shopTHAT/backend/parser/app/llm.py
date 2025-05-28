from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
from groq import Groq, RateLimitError, APIError
from langchain.llms.base import LLM
from pydantic import Field
from backend.parser.app.settings import settings
import logging

logger = logging.getLogger(__name__)

class GroqLLM(LLM):
    client: Groq = Field(...)
    primary_model: str = settings.primary_model
    fallback_model: str = settings.fallback_model
    temperature: float = settings.temperature

    @property
    def _llm_type(self) -> str:
        return "groq"

    @property
    def identifying_params(self) -> dict:
        return {
            "primary_model":   self.primary_model,
            "fallback_model":  self.fallback_model,
            "temperature":     self.temperature,
        }

    @retry(
        wait=wait_exponential(
            multiplier=settings.retry_backoff_multiplier,
            min=settings.retry_backoff_min,
            max=settings.retry_backoff_max
        ),
        stop=stop_after_attempt(settings.retry_attempts),
        retry=retry_if_exception_type(RateLimitError)
    )
    def _call(self, prompt: str, stop=None) -> str:
        try:
            resp = self.client.chat.completions.create(
                model=self.primary_model,
                messages=[{"role": "system", "content": prompt}],
                temperature=self.temperature,
            )
            return resp.choices[0].message.content.strip()

        except APIError as e:
            if getattr(e, "status_code", None) == 503:
                logger.warning(
                    f"Primary model {self.primary_model} unavailable (503). "
                    f"Falling back to {self.fallback_model}."
                )
                resp = self.client.chat.completions.create(
                    model=self.fallback_model,
                    messages=[{"role": "system", "content": prompt}],
                    temperature=self.temperature,
                )
                return resp.choices[0].message.content.strip()
            raise
