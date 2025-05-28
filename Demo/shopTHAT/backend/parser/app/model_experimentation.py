from groq import Groq
client = Groq(api_key="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")

# 1) Build your chat prompt, embedding the image URL:
messages = [
  {"role": "system", "content": "You are a product marketing assistant."},
  {"role": "user",
   "content": "Here’s a product image: https://example.com/path/to/image.jpg\n"
              "Please write a 2-sentence marketing description of this product."}
]

# 2) Call the multimodal LLaVA model
resp = client.chat.completions.create(
  model="llava-v1.5-7b-4096-preview",
  messages=messages
)

print(resp.choices[0].message.content)
