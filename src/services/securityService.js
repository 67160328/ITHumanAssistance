const FASTAPI_BASE_URL = 'http://localhost:8000';

const CLIENT_PATTERNS = [
  {
    type: 'api_key',
    regex: /(sk-[a-zA-Z0-9_-]{20,}|AIza[0-9A-Za-z-_]{35}|ghp_[a-zA-Z0-9]{36}|Bearer\s+[a-zA-Z0-9_\-\.]{25,})/gi,
    replacement: '[REDACTED_API_KEY]'
  },
  {
    type: 'password',
    regex: /(?:password|passwd|pwd|secret|รหัสผ่าน)\s*[:=]\s*([^\s,;]+)/gi,
    replacement: '[REDACTED_PASSWORD]'
  },
  {
    type: 'pii_email',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/gi,
    replacement: '[REDACTED_EMAIL]'
  },
  {
    type: 'pii_thai_id',
    regex: /\b\d{1}[- ]?\d{4}[- ]?\d{5}[- ]?\d{2}[- ]?\d{1}\b/gi,
    replacement: '[REDACTED_THAI_ID]'
  },
  {
    type: 'pii_phone',
    regex: /\b(?:0[689]\d{8}|0[23457]\d{7}|\+66\s?[689]\d{8}|\b\d{3}[-.]?\d{3}[-.]?\d{4}\b)/gi,
    replacement: '[REDACTED_PHONE]'
  }
];

export async function sanitizeText(text) {
  if (!text) return { sanitizedText: text, maskedItems: [], hasPii: false };

  try {
    const res = await fetch(`${FASTAPI_BASE_URL}/api/security/sanitize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (res.ok) {
      const data = await res.json();
      return {
        sanitizedText: data.sanitized_text,
        maskedItems: data.masked_items,
        hasPii: data.has_pii
      };
    }
  } catch (err) {
    // client fallback
  }

  return sanitizeClientText(text);
}

export function sanitizeClientText(text) {
  if (!text) return { sanitizedText: text, maskedItems: [], hasPii: false };

  let sanitized = text;
  const maskedItems = [];

  for (const item of CLIENT_PATTERNS) {
    let match;
    const regex = new RegExp(item.regex.source, item.regex.flags);
    while ((match = regex.exec(text)) !== null) {
      const matchedStr = match[0];
      maskedItems.push({
        type: item.type,
        original: matchedStr.length > 4 ? matchedStr.slice(0, 4) + '***' : '***',
        masked: item.replacement
      });
    }
    sanitized = sanitized.replace(item.regex, item.replacement);
  }

  return {
    sanitizedText: sanitized,
    maskedItems,
    hasPii: maskedItems.length > 0
  };
}
