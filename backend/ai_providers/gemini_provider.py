import json
import httpx
from typing import Dict, Any, Optional
from .base_provider import BaseAIProvider

class GeminiProvider(BaseAIProvider):
    """
    Provider สำหรับ Google Gemini AI
    ใช้ Endpoint v1beta generateContent พร้อมสลับโมเดลอัตโนมัติ
    """

    CANDIDATE_MODELS = [
        "gemini-3.8-flash",
        "gemini-3.5-flash-lite",
        "gemini-flash-latest",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite"
    ]

    def __init__(self):
        super().__init__(provider_name="Google Gemini")

    async def translate(
        self,
        system_prompt: str,
        user_prompt: str,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout_seconds: float = 16.0
    ) -> Dict[str, Any]:
        if not api_key or not api_key.strip():
            raise ValueError("Gemini API Key is missing or empty.")

        key = api_key.strip()
        request_body = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "topP": 0.8,
                "responseMimeType": "application/json"
            }
        }

        last_error = None
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            for model in self.CANDIDATE_MODELS:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
                try:
                    resp = await client.post(url, json=request_body)
                    if resp.status_code == 200:
                        res_data = resp.json()
                        raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
                        cleaned = raw_text.replace("```json", "").replace("```", "").strip()
                        parsed = json.loads(cleaned)
                        return {
                            "data": parsed,
                            "model_used": model,
                            "provider": self.provider_name
                        }
                    else:
                        last_error = f"Gemini {model} returned HTTP {resp.status_code}: {resp.text[:200]}"
                except Exception as e:
                    last_error = f"Gemini {model} connection error: {str(e)}"

        raise RuntimeError(f"All Gemini models failed. Last error: {last_error}")
