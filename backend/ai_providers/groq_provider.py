import json
import httpx
from typing import Dict, Any, Optional
from .base_provider import BaseAIProvider

class GroqProvider(BaseAIProvider):
    """
    Provider สำหรับ Groq Cloud (Ultra-Fast Inference LPU)
    ใช้ OpenAI-compatible Chat Completions API
    ฟรี 100% ตอบสนองเร็วระดับ 300-500 tokens/s
    """

    DEFAULT_MODELS = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant"
    ]

    def __init__(self):
        super().__init__(provider_name="Groq Cloud LPU")

    async def translate(
        self,
        system_prompt: str,
        user_prompt: str,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout_seconds: float = 12.0
    ) -> Dict[str, Any]:
        if not api_key or not api_key.strip():
            raise ValueError("Groq API Key is missing or empty.")

        key = api_key.strip()
        endpoint = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"
        }

        last_error = None
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            # Query active models dynamically from Groq account
            active_models = list(self.DEFAULT_MODELS)
            try:
                models_resp = await client.get("https://api.groq.com/openai/v1/models", headers=headers)
                if models_resp.status_code == 200:
                    available = [m["id"] for m in models_resp.json().get("data", [])]
                    print(f"DEBUG Groq: Available models on account: {available[:8]}")
                    # Prioritize available models
                    dynamic_models = [m for m in available if "llama" in m or "mixtral" in m or "gemma" in m or "qwen" in m]
                    if dynamic_models:
                        active_models = dynamic_models + active_models
            except Exception as e:
                print(f"DEBUG Groq: Could not list models: {e}")

            # Deduplicate while preserving order
            seen = set()
            models_to_try = []
            for m in active_models:
                if m not in seen:
                    seen.add(m)
                    models_to_try.append(m)

            for model in models_to_try:
                payload = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.2,
                    "max_tokens": 2048
                }
                try:
                    print(f"DEBUG Groq: Attempting model {model}...")
                    resp = await client.post(endpoint, json=payload, headers=headers)
                    print(f"DEBUG Groq: Model {model} status {resp.status_code}")
                    if resp.status_code == 200:
                        res_data = resp.json()
                        raw_content = res_data["choices"][0]["message"]["content"]
                        cleaned = raw_content.replace("```json", "").replace("```", "").strip()
                        parsed = json.loads(cleaned)
                        print(f"DEBUG Groq: Model {model} SUCCESS!")
                        return {
                            "data": parsed,
                            "model_used": model,
                            "provider": self.provider_name
                        }
                    else:
                        print(f"DEBUG Groq: Model {model} failed with body: {resp.text[:300]}")
                        last_error = f"Groq {model} returned HTTP {resp.status_code}: {resp.text[:200]}"
                except Exception as e:
                    print(f"DEBUG Groq: Model {model} exception: {e}")
                    last_error = f"Groq {model} connection error: {str(e)}"

        raise RuntimeError(f"All Groq models failed. Last error: {last_error}")
