import os
import json
import httpx
from typing import Dict, Any, Optional, Tuple

SYSTEM_TELEGRAM_TOKEN = "8893607516:AAE7EvjSy5Vn-wbLAmPcshI0WqEA42mzNmM"
DEFAULT_TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", SYSTEM_TELEGRAM_TOKEN)
DEFAULT_TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

def escape_html(text: str) -> str:
    """Escapes HTML special characters for Telegram HTML parse mode."""
    if not text:
        return ""
    return str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def format_telegram_message(data: Dict[str, Any], mode: str) -> str:
    """
    Format translated AI data into an elegant, readable Telegram HTML message.
    """
    if mode == "human-to-tech":
        summary = escape_html(data.get("summary", "ไม่มีข้อกำหนดสรุป"))
        msg = f"🚀 <b>[IT Translator] ข้อกำหนดทางเทคนิค (Technical Requirements)</b>\n\n"
        msg += f"📌 <b>เป้าหมายหลัก:</b>\n{summary}\n\n"

        tech_reqs = data.get("technicalRequirements", [])
        if tech_reqs:
            msg += "⚙️ <b>ข้อกำหนดทางเทคนิค:</b>\n"
            for req in tech_reqs[:6]:
                msg += f"• {escape_html(req)}\n"
            if len(tech_reqs) > 6:
                msg += f"<i>...และอีก {len(tech_reqs) - 6} ข้อกำหนด</i>\n"
            msg += "\n"

        tech_stack = data.get("techStack", [])
        if tech_stack:
            msg += "🛠️ <b>Tech Stack ที่แนะนำ:</b>\n"
            for item in tech_stack[:4]:
                name = escape_html(item.get("name", ""))
                desc = escape_html(item.get("desc", ""))
                msg += f"• <b>{name}</b>: {desc}\n"
            msg += "\n"

        impact = data.get("impactAnalysis")
        if impact and isinstance(impact, dict):
            modules = ", ".join(impact.get("affectedModules", [])) or "ไม่มี"
            tables = ", ".join(impact.get("affectedTables", [])) or "ไม่มี"
            effort = impact.get("refactoringEffortDays", "0 วัน")
            severity = impact.get("impactSeverity", "Low")
            msg += "🏢 <b>Impact Analysis:</b>\n"
            msg += f"• ความรุนแรง: <b>{escape_html(severity)}</b>\n"
            msg += f"• โมดูลเดิมที่กระทบ: {escape_html(modules)}\n"
            msg += f"• ตารางฐานข้อมูล: {escape_html(tables)}\n"
            msg += f"• เวลา Refactoring: {escape_html(effort)}\n\n"

        estimation = data.get("effortEstimation")
        if estimation and isinstance(estimation, dict):
            complexity = estimation.get("complexity", "Medium")
            mandays = estimation.get("estimatedManDays", "-")
            cost = estimation.get("estimatedCostRange", "-")
            msg += "⏱️ <b>Effort & Cost Estimation:</b>\n"
            msg += f"• ความซับซ้อน: {escape_html(complexity)}\n"
            msg += f"• ระยะเวลาประเมิน: {escape_html(mandays)}\n"
            msg += f"• กรอบงบประมาณ: {escape_html(cost)}\n\n"

        risks = data.get("riskAnalysis", [])
        if risks:
            msg += "⚠️ <b>ข้อควรระวัง / ความเสี่ยง:</b>\n"
            for r in risks[:3]:
                msg += f"• {escape_html(r)}\n"
            msg += "\n"

        msg += "<i>สร้างโดยระบบ IT-to-Human Translator Enterprise</i>"
        return msg

    else:
        # tech-to-human
        summary = escape_html(data.get("summary", "อัปเดตงานเทคนิค"))
        polite = escape_html(data.get("politeExplanation", ""))
        impact = escape_html(data.get("impact", "-"))
        est_time = escape_html(data.get("estimatedTime", "-"))

        msg = f"✉️ <b>[IT Translator] แจ้งอัปเดตสำหรับลูกค้า</b>\n\n"
        msg += f"📌 <b>สรุป:</b> {summary}\n\n"
        msg += f"💬 <b>คำอธิบาย:</b>\n{polite}\n\n"

        analogy = data.get("analogy")
        if analogy and isinstance(analogy, dict):
            icon = analogy.get("icon", "💡")
            title = escape_html(analogy.get("title", "เปรียบเสมือน"))
            desc = escape_html(analogy.get("description", ""))
            msg += f"{icon} <b>{title}:</b>\n<i>{desc}</i>\n\n"

        msg += f"📌 <b>ผลกระทบต่อการใช้งาน:</b> {impact}\n"
        msg += f"⏱️ <b>ระยะเวลาประเมิน:</b> {est_time}\n\n"
        msg += "<i>สร้างโดยระบบ IT-to-Human Translator Enterprise</i>"
        return msg

async def send_telegram_message(
    token: str,
    chat_id: str,
    text: str,
    parse_mode: str = "HTML"
) -> Dict[str, Any]:
    """
    ส่งข้อความตัวอักษรไปยัง Telegram Chat ID ผ่าน Telegram Bot API
    """
    bot_token = token.strip() if token and token.strip() else DEFAULT_TELEGRAM_TOKEN
    target_chat = chat_id.strip() if chat_id and chat_id.strip() else DEFAULT_TELEGRAM_CHAT_ID

    if not bot_token:
        raise ValueError("กรุณาระบุ Telegram Bot Token")
    if not target_chat:
        raise ValueError("กรุณาระบุ Telegram Chat ID หรือ Username (@channel)")

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": target_chat,
        "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": True
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(url, json=payload)
        res_json = resp.json()
        if not resp.is_success or not res_json.get("ok"):
            err_desc = res_json.get("description", resp.text)
            raise RuntimeError(f"Telegram API Error: {err_desc}")
        return res_json

async def send_telegram_document(
    token: str,
    chat_id: str,
    file_bytes: bytes,
    filename: str,
    caption: str = ""
) -> Dict[str, Any]:
    """
    ส่งไฟล์แนบ (เช่น JSON structure หรือ Markdown) ไปยัง Telegram Chat ID
    """
    bot_token = token.strip() if token and token.strip() else DEFAULT_TELEGRAM_TOKEN
    target_chat = chat_id.strip() if chat_id and chat_id.strip() else DEFAULT_TELEGRAM_CHAT_ID

    if not bot_token:
        raise ValueError("กรุณาระบุ Telegram Bot Token")
    if not target_chat:
        raise ValueError("กรุณาระบุ Telegram Chat ID")

    url = f"https://api.telegram.org/bot{bot_token}/sendDocument"
    files = {
        "document": (filename, file_bytes)
    }
    data = {
        "chat_id": target_chat,
        "caption": caption[:1024] if caption else "",
        "parse_mode": "HTML"
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, data=data, files=files)
        res_json = resp.json()
        if not resp.is_success or not res_json.get("ok"):
            err_desc = res_json.get("description", resp.text)
            raise RuntimeError(f"Telegram API Error: {err_desc}")
        return res_json

async def test_telegram_connection(token: str, chat_id: str) -> Dict[str, Any]:
    """
    ทดสอบยิงข้อความ Ping สั้นๆ ไปยัง Chat ID เพื่อยืนยันว่าการตั้งค่าถูกต้อง
    """
    test_msg = "🤖 <b>[IT Translator Test]</b>\nระบบเชื่อมต่อ Telegram Bot สำเร็จพร้อมส่งโครงสร้างข้อมูล AI เรียบร้อยแล้ว!"
    return await send_telegram_message(token, chat_id, test_msg, parse_mode="HTML")
