const { ProviderError, fetchWithTimeout, safeText } = require('./shared');

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

async function generate({ apiKey, model, systemPrompt, userText, images }) {
  if (!apiKey) throw new ProviderError('Gemini API key is not configured on the server (GEMINI_API_KEY)', 500);

  const parts = [{ text: userText }];
  if (images && images.length) {
    for (const img of images) {
      parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
    }
  }

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0.3 }
  };

  const res = await fetchWithTimeout(
    `${BASE}/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    },
    30000
  );

  if (!res.ok) {
    throw new ProviderError(`Gemini API error (${res.status}): ${await safeText(res)}`, res.status);
  }

  const data = await res.json();
  const candidate = data.candidates && data.candidates[0];
  const text = candidate && candidate.content && candidate.content.parts
    ? candidate.content.parts.map((p) => p.text || '').join('')
    : '';

  return {
    text,
    usage: {
      inputTokens: data.usageMetadata ? data.usageMetadata.promptTokenCount : null,
      outputTokens: data.usageMetadata ? data.usageMetadata.candidatesTokenCount : null,
      totalTokens: data.usageMetadata ? data.usageMetadata.totalTokenCount : null
    }
  };
}

async function listModels(apiKey) {
  if (!apiKey) throw new ProviderError('Gemini API key is not configured on the server (GEMINI_API_KEY)', 500);
  const res = await fetchWithTimeout(`${BASE}/models?key=${apiKey}`, {}, 15000);
  if (!res.ok) throw new ProviderError(`Gemini list-models error (${res.status}): ${await safeText(res)}`, res.status);
  const data = await res.json();
  return (data.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m) => m.name.replace('models/', ''))
    .sort();
}

module.exports = { generate, listModels };
