import json
import httpx
from typing import Dict, Any, Optional
from .base_provider import BaseAIProvider

class OllamaProvider(BaseAIProvider):
    """
    Provider สำหรับ Local Ollama (On-Premise / Data Sovereignty)
    รันผ่าน http://localhost:11434 หรือ URL ภายในองค์กร
    ไม่ส่งข้อมูลออกนอกเครื่อง รองรับ Qwen 2.5, Llama 3, DeepSeek
    """

    DEFAULT_MODELS = [
        "qwen2.5:7b",
        "qwen2.5:14b",
        "llama3.1:8b",
        "mistral:7b"
    ]

    def __init__(self):
        super().__init__(provider_name="Local Ollama")

    async def translate(
        self,
        system_prompt: str,
        user_prompt: str,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout_seconds: float = 25.0
    ) -> Dict[str, Any]:
        url = (base_url or "http://localhost:11434").rstrip("/")
        endpoint = f"{url}/api/chat"

        last_error = None
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            for model in self.DEFAULT_MODELS:
                payload = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "format": "json",
                    "stream": False,
                    "options": {
                        "temperature": 0.2
                    }
                }
                try:
                    resp = await client.post(endpoint, json=payload)
                    if resp.status_code == 200:
                        res_data = resp.json()
                        raw_content = res_data["message"]["content"]
                        cleaned = raw_content.replace("```json", "").replace("```", "").strip()
                        parsed = json.loads(cleaned)
                        return {
                            "data": parsed,
                            "model_used": model,
                            "provider": self.provider_name
                        }
                    else:
                        last_error = f"Ollama {model} returned HTTP {resp.status_code}: {resp.text[:200]}"
                except Exception as e:
                    last_error = f"Ollama {model} connection error: {str(e)}"

        raise RuntimeError(f"Ollama execution failed. Last error: {last_error}")
