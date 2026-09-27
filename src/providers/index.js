const groq = require('./groq');
const gemini = require('./gemini');
const providerConfigs = require('../config/providers');

const adapters = { groq, gemini };

function getAdapter(providerKey) {
  const adapter = adapters[providerKey];
  if (!adapter) throw new Error(`Unknown provider: ${providerKey}`);
  return adapter;
}

function getConfig(providerKey) {
  return providerConfigs.find((p) => p.key === providerKey);
}

function getApiKey(providerKey) {
  const cfg = getConfig(providerKey);
  if (!cfg) return null;
  return process.env[cfg.envVar] || null;
}

module.exports = { adapters, getAdapter, getConfig, getApiKey, providerConfigs };
