// Approximate USD price per 1,000 tokens, for demonstration/reporting purposes.
// Both Groq and Gemini offer free tiers, so real cost while testing is $0 -
// these figures reflect each provider's public paid pricing so the dashboard
// can still show a meaningful "estimated cost if this were billed" figure.
const PRICE_TABLE = {
  groq: {
    default: { in: 0.05, out: 0.08 }
  },
  gemini: {
    default: { in: 0.0, out: 0.0 } // free tier during evaluation
  }
};

function estimateCost(provider, model, inputTokens, outputTokens) {
  if (inputTokens == null || outputTokens == null) return null;
  const table = PRICE_TABLE[provider] || {};
  const price = table[model] || table.default || { in: 0, out: 0 };
  return Number(((inputTokens / 1000) * price.in + (outputTokens / 1000) * price.out).toFixed(6));
}

module.exports = { estimateCost };
