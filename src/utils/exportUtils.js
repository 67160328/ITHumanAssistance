/**
 * Export utilities for IT Human Translator
 */

/**
 * Format translation result as Markdown string
 */
export function generateMarkdown(result) {
  if (!result || !result.data) return '';
  const { mode, data } = result;

  if (mode === 'human-to-tech') {
    let md = `# 📌 [ความต้องการหลัก]\n${data.summary}\n\n`;
    
    md += `## ⚙️ ข้อกำหนดทางเทคนิค (Technical Requirements)\n`;
    if (data.technicalRequirements && data.technicalRequirements.length > 0) {
      md += data.technicalRequirements.map(req => `- ${req}`).join('\n') + '\n\n';
    }

    md += `## 🛠️ แนะนำ Tech Stack\n`;
    if (data.techStack && data.techStack.length > 0) {
      md += data.techStack.map(ts => `- **${ts.name}**: ${ts.desc}`).join('\n') + '\n\n';
    }

    if (data.acceptanceCriteria && data.acceptanceCriteria.length > 0) {
      md += `## 📋 เงื่อนไขการตรวจรับงาน (Acceptance Criteria)\n`;
      md += data.acceptanceCriteria.map(ac => `- ${ac}`).join('\n') + '\n\n';
    }

    if (data.nonFunctionalRequirements && data.nonFunctionalRequirements.length > 0) {
      md += `## 🛡️ ข้อกำหนดด้านประสิทธิภาพและความปลอดภัย (Non-Functional Requirements)\n`;
      md += data.nonFunctionalRequirements.map(nfr => `- ${nfr}`).join('\n') + '\n\n';
    }

    if (data.apiDraft && data.apiDraft.length > 0) {
      md += `## 🔌 ร่างโครงสร้าง API & Data Payloads (API Specification Draft)\n`;
      md += data.apiDraft.map(api => `- \`${api}\``).join('\n') + '\n\n';
    }

    if (data.riskAnalysis && data.riskAnalysis.length > 0) {
      md += `## ⚠️ ข้อควรระวัง / ความเสี่ยง\n`;
      md += data.riskAnalysis.map(r => `- ${r}`).join('\n') + '\n\n';
    }

    if (data.effortEstimation) {
      md += `## ⏱️ การประเมินระยะเวลาและงบประมาณ (Effort Estimation)\n`;
      md += `- **ความซับซ้อน (Complexity):** ${data.effortEstimation.complexity}\n`;
      md += `- **ระยะเวลาทำงาน (Man-Days):** ${data.effortEstimation.estimatedManDays}\n`;
      md += `- **งบประมาณโดยประมาณ:** ${data.effortEstimation.estimatedCostRange}\n`;
      if (data.effortEstimation.reasoning) {
        md += `- **เหตุผล:** ${data.effortEstimation.reasoning}\n`;
      }
      md += '\n';
    }

    if (data.suggestedQuestions && data.suggestedQuestions.length > 0) {
      md += `## ❓ คำถามที่ควรถามลูกค้าเพิ่ม\n`;
      md += data.suggestedQuestions.map(q => `- ${q}`).join('\n') + '\n';
    }

    return md;
  } else {
    let md = `# ✉️ [คำอธิบายสำหรับส่งลูกค้า]\n${data.politeExplanation}\n\n`;

    if (data.analogy) {
      md += `## 💡 ${data.analogy.title || 'เปรียบเสมือน'}\n`;
      md += `${data.analogy.description || ''}\n\n`;
    }

    md += `## 📌 ผลกระทบต่อผู้ใช้งาน\n${data.impact}\n\n`;
    md += `## ⏱️ ระยะเวลาแก้ไขโดยประมาณ\n${data.estimatedTime}\n`;

    return md;
  }
}

/**
 * Format translation result as Jira markup string
 */
export function generateJiraFormat(result) {
  if (!result || !result.data) return '';
  const { mode, data } = result;

  if (mode === 'human-to-tech') {
    let jira = `h1. User Story / Feature Requirement\n\n*Summary:* ${data.summary}\n\n`;
    
    jira += `h2. Technical Requirements\n`;
    if (data.technicalRequirements && data.technicalRequirements.length > 0) {
      jira += data.technicalRequirements.map(req => `* ${req}`).join('\n') + '\n\n';
    }

    jira += `h2. Recommended Tech Stack\n`;
    if (data.techStack && data.techStack.length > 0) {
      jira += data.techStack.map(ts => `* *${ts.name}*: ${ts.desc}`).join('\n') + '\n\n';
    }

    if (data.riskAnalysis && data.riskAnalysis.length > 0) {
      jira += `h2. Risk Analysis\n`;
      jira += data.riskAnalysis.map(r => `* ${r}`).join('\n') + '\n\n';
    }

    if (data.effortEstimation) {
      jira += `h2. Effort & Cost Estimation\n`;
      jira += `* *Complexity:* ${data.effortEstimation.complexity}\n`;
      jira += `* *Estimated Man-Days:* ${data.effortEstimation.estimatedManDays}\n`;
      jira += `* *Estimated Cost Range:* ${data.effortEstimation.estimatedCostRange}\n`;
      if (data.effortEstimation.reasoning) {
        jira += `* *Reasoning:* ${data.effortEstimation.reasoning}\n`;
      }
      jira += '\n';
    }

    if (data.suggestedQuestions && data.suggestedQuestions.length > 0) {
      jira += `h2. Follow-up Questions for Client\n`;
      jira += data.suggestedQuestions.map(q => `* ${q}`).join('\n') + '\n';
    }

    return jira;
  } else {
    let jira = `h1. Client Communication Draft\n\n${data.politeExplanation}\n\n`;

    if (data.analogy) {
      jira += `h2. Analogy / Comparison\n`;
      jira += `*${data.analogy.title}*\n${data.analogy.description}\n\n`;
    }

    jira += `h2. User Impact\n${data.impact}\n\n`;
    jira += `h2. Estimated Resolution Time\n${data.estimatedTime}\n`;

    return jira;
  }
}

/**
 * Trigger download of Markdown file
 */
export function downloadMarkdownFile(result) {
  const content = generateMarkdown(result);
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `translation-spec-${Date.now()}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Open print dialog formatted for PDF export
 */
export function exportToPDF(result) {
  const contentMd = generateMarkdown(result);
  const printWindow = window.open('', '_blank');
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>IT Human Translator - Specification Document</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Kanit:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Kanit', 'Inter', sans-serif;
          color: #1e293b;
          line-height: 1.6;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          border-bottom: 2px solid #6366f1;
          padding-bottom: 15px;
          margin-bottom: 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header h1 {
          margin: 0;
          color: #4f46e5;
          font-size: 24px;
        }
        .header span {
          color: #64748b;
          font-size: 14px;
        }
        .content {
          font-size: 15px;
          white-space: pre-wrap;
        }
        h1, h2, h3 {
          color: #0f172a;
          margin-top: 24px;
          margin-bottom: 12px;
        }
        .footer {
          margin-top: 50px;
          border-top: 1px solid #e2e8f0;
          padding-top: 15px;
          font-size: 12px;
          color: #94a3b8;
          text-align: center;
        }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🚀 IT Human Translator Report</h1>
        <span>Generated: ${new Date().toLocaleDateString('th-TH')}</span>
      </div>
      <div class="content">${contentMd.replace(/#/g, '').trim()}</div>
      <div class="footer">
        Generated by IT Human Translator Platform - Powered by FastAPI & Gemini AI
      </div>
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

/**
 * Generate formal Client Communication Email Draft
 */
export function generateClientEmailDraft(result) {
  if (!result || !result.data) return '';
  const { data } = result;

  const subject = `[แจ้งอัปเดตสถานะระบบ] ${data.summary || 'รายงานความคืบหน้าการทำงานชั่วคราว'}`;
  
  let email = `เรื่อง: ${subject}\n\n`;
  email += `เรียน ท่านลูกค้าที่เคารพ,\n\n`;
  email += `${data.politeExplanation || 'ทางทีมงานขอแจ้งรายงานความคืบหน้าการทำงานครับ'}\n\n`;

  if (data.analogy) {
    email += `💡 ${data.analogy.title || 'อธิบายเพิ่มเติม'}\n`;
    email += `${data.analogy.description || ''}\n\n`;
  }

  if (data.impact) {
    email += `📌 ผลกระทบต่อการใช้งาน:\n${data.impact}\n\n`;
  }

  if (data.estimatedTime) {
    email += `⏱️ กรอบเวลาการแก้ไขโดยประมาณ:\n${data.estimatedTime}\n\n`;
  }

  email += `หากท่านมีข้อสงสัยเพิ่มเติม สามารถติดต่อทีมงานผ่านช่องทางนี้ได้ตลอดเวลาครับ\n\n`;
  email += `ขอแสดงความนับถือ,\nทีมงานวิศวกรรมและบริหารจัดการระบบ (Engineering Support Team)`;

  return email;
}


/**
 * Generate OpenAPI 3.0 JSON specification from translation result
 */
export function generateOpenAPISpec(result) {
  if (!result || !result.data) return {};
  const { data } = result;

  const paths = {};

  // Extract endpoints from apiDraft if available
  if (data.apiDraft && Array.isArray(data.apiDraft)) {
    data.apiDraft.forEach(item => {
      const parts = item.split(' - ');
      const routePart = parts[0] || '';
      const descPart = parts[1] || 'API Endpoint generated by IT Human Translator';
      
      const routeMatch = routePart.match(/^(GET|POST|PUT|DELETE|PATCH)\s+(\/[^\s]*)/i);
      if (routeMatch) {
        const method = routeMatch[1].toLowerCase();
        const path = routeMatch[2];

        if (!paths[path]) paths[path] = {};
        paths[path][method] = {
          summary: descPart,
          description: descPart,
          responses: {
            "200": {
              description: "Successful Operation",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "success" },
                      data: { type: "object" }
                    }
                  }
                }
              }
            }
          }
        };
      }
    });
  }

  // Fallback default path if empty
  if (Object.keys(paths).length === 0) {
    paths["/api/v1/feature/action"] = {
      post: {
        summary: data.summary || "Generated Feature Action Endpoint",
        responses: {
          "200": { description: "Successful response" }
        }
      }
    };
  }

  return {
    openapi: "3.0.0",
    info: {
      title: `API Spec: ${data.summary ? data.summary.slice(0, 50) : 'IT Human Translator Draft'}`,
      description: `Generated Technical Specification by IT Human Translator\n\nSummary: ${data.summary || ''}`,
      version: "1.0.0"
    },
    paths: paths
  };
}

/**
 * Trigger download of OpenAPI Specification JSON file
 */
export function downloadOpenAPIJson(result) {
  const specObj = generateOpenAPISpec(result);
  const jsonStr = JSON.stringify(specObj, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `openapi-spec-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

