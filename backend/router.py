import time
import os
from typing import Dict, Any, Optional, Tuple, List
from .ai_providers import GeminiProvider, GroqProvider, OllamaProvider

class MultiAIRouter:
    """
    Intelligent Multi-AI Router & Failover Engine
    ลำดับ Failover อัตโนมัติ:
    1. หากระบุ security_mode == "private-local": ใช้ Ollama (Localhost) ทันที
    2. โหมด Cloud: Gemini ➔ Groq ➔ Ollama ➔ Local Fallback Engine
    """

    def __init__(self):
        self.gemini = GeminiProvider()
        self.groq = GroqProvider()
        self.ollama = OllamaProvider()

    async def execute_translation(
        self,
        system_prompt: str,
        user_prompt: str,
        gemini_key: Optional[str] = None,
        groq_key: Optional[str] = None,
        ollama_url: Optional[str] = None,
        security_mode: str = "cloud",
        preferred_provider: str = "auto"
    ) -> Tuple[Optional[Dict[str, Any]], str, float]:
        """
        ส่งแปลภาษาตามนโยบาย Routing
        Returns: (parsed_data, provider_info, elapsed_time_seconds)
        """
        start_time = time.time()

        # 1. Private Local Mode (On-Premise / No Cloud)
        if security_mode == "private-local":
            try:
                res = await self.ollama.translate(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    base_url=ollama_url
                )
                elapsed = round(time.time() - start_time, 2)
                return res["data"], f"Local Ollama ({res['model_used']})", elapsed
            except Exception as e:
                print(f"[Router Warning] Ollama local call failed: {e}")
                return None, "Local Ollama Failed", round(time.time() - start_time, 2)

        # 2. Preferred Provider if explicitly chosen
        effective_gemini_key = gemini_key or os.getenv("GEMINI_API_KEY", "")
        effective_groq_key = groq_key or os.getenv("GROQ_API_KEY", "")

        if preferred_provider == "groq" and effective_groq_key:
            try:
                res = await self.groq.translate(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    api_key=effective_groq_key
                )
                elapsed = round(time.time() - start_time, 2)
                return res["data"], f"Groq LPU ({res['model_used']})", elapsed
            except Exception as e:
                print(f"[Router Warning] Preferred Groq failed: {e}, falling back to auto sequence.")

        # 3. Standard Failover Sequence (Gemini -> Groq -> Ollama)
        # Attempt 1: Google Gemini
        if effective_gemini_key and effective_gemini_key.strip():
            try:
                res = await self.gemini.translate(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    api_key=effective_gemini_key
                )
                elapsed = round(time.time() - start_time, 2)
                return res["data"], f"Google Gemini ({res['model_used']})", elapsed
            except Exception as e:
                print(f"[Router Failover] Gemini failed: {e}. Switching to Groq...")

        # Attempt 2: Groq Cloud LPU
        if effective_groq_key and effective_groq_key.strip():
            try:
                res = await self.groq.translate(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    api_key=effective_groq_key
                )
                elapsed = round(time.time() - start_time, 2)
                return res["data"], f"Groq LPU Failover ({res['model_used']})", elapsed
            except Exception as e:
                print(f"[Router Failover] Groq failed: {e}. Trying Ollama...")

        # Attempt 3: Local Ollama (if available)
        try:
            res = await self.ollama.translate(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                base_url=ollama_url,
                timeout_seconds=5.0  # Fast probe for local daemon
            )
            elapsed = round(time.time() - start_time, 2)
            return res["data"], f"Ollama Localhost ({res['model_used']})", elapsed
        except Exception:
            pass

        # Return None to let services.py invoke Deterministic Rule Fallback Engine
        elapsed = round(time.time() - start_time, 2)
        return None, "Local Deterministic Engine", elapsed
