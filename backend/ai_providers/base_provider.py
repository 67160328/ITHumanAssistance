import abc
from typing import Dict, Any, Optional

class BaseAIProvider(abc.ABC):
    """
    Abstract Base Class สำหรับ AI Providers ทั้งหมด
    กำหนด Interface มาตรฐานเพื่อให้ Smart Router ใช้งานได้แบบ Polymorphic
    """

    def __init__(self, provider_name: str):
        self.provider_name = provider_name

    @abc.abstractmethod
    async def translate(
        self,
        system_prompt: str,
        user_prompt: str,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout_seconds: float = 15.0
    ) -> Dict[str, Any]:
        """
        ส่งคำขอไปยัง AI Provider และแปลงผลลัพธ์เป็น Dict JSON มาตรฐาน
        หากล้มเหลว ต้อง raise Exception เพื่อให้ Smart Router ทำ Failover ไปยัง Provider ถัดไป
        """
        pass
