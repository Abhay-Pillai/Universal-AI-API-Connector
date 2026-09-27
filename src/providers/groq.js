const { ProviderError, fetchWithTimeout, safeText } = require('./shared');

const BASE = 'https://api.groq.com/openai/v1';

// Groq's free-tier chat completions do not accept image input on most models,
// so we only send text. If images were provided for a Groq connector, we
// mention that they were supplied but can't be processed, inside the prompt.
async function generate({ apiKey, model, systemPrompt, userText, images }) {
  if (!apiKey) throw new ProviderError('Groq API key is not configured on the server (GROQ_API_KEY)', 500);

  let finalUserText = userText;
  if (images && images.length) {
    finalUserText += `\n\n[Note: ${images.length} image(s) were submitted but the selected Groq model does not support image input in this connector.]`;
  }

  const res = await fetchWithTimeout(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: finalUserText }
      ],
      temperature: 0.3
    })
  }, 30000);

  if (!res.ok) {
    throw new ProviderError(`Groq API error (${res.status}): ${await safeText(res)}`, res.status);
  }

  const data = await res.json();
  const text = data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : '';

  return {
    text,
    usage: {
      inputTokens: data.usage ? data.usage.prompt_tokens : null,
      outputTokens: data.usage ? data.usage.completion_tokens : null,
      totalTokens: data.usage ? data.usage.total_tokens : null
    }
  };
}

async function listModels(apiKey) {
  if (!apiKey) throw new ProviderError('Groq API key is not configured on the server (GROQ_API_KEY)', 500);
  const res = await fetchWithTimeout(`${BASE}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  }, 15000);
  if (!res.ok) throw new ProviderError(`Groq list-models error (${res.status}): ${await safeText(res)}`, res.status);
  const data = await res.json();
  return (data.data || []).map((m) => m.id).sort();
}

module.exports = { generate, listModels };
