class ProviderError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ProviderError';
    this.status = status || 502;
  }
}

// Node 18+ has global fetch. We just add an abort-based timeout.
async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new ProviderError(`Request to AI provider timed out after ${timeoutMs}ms`, 504);
    }
    throw new ProviderError(`Network error calling AI provider: ${e.message}`, 502);
  } finally {
    clearTimeout(timer);
  }
}

async function safeText(res) {
  try {
    const t = await res.text();
    return t.slice(0, 500);
  } catch (e) {
    return '(no response body)';
  }
}

module.exports = { ProviderError, fetchWithTimeout, safeText };
