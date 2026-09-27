// Central registry of supported AI providers.
// Adding a new provider = add an adapter in src/providers/ + one entry here.
// API keys are NEVER stored in the database or sent to the browser - they live
// only in the server's environment variables (.env), one key per provider.

module.exports = [
  {
    key: 'groq',
    label: 'Groq (free)',
    envVar: 'GROQ_API_KEY',
    supportsImages: false,
    keyInfoUrl: 'https://console.groq.com/keys',
    defaultModels: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'llama-3.2-11b-vision-preview',
      'mixtral-8x7b-32768'
    ]
  },
  {
    key: 'gemini',
    label: 'Google Gemini (free)',
    envVar: 'GEMINI_API_KEY',
    supportsImages: true,
    keyInfoUrl: 'https://aistudio.google.com/apikey',
    defaultModels: [
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ]
  }
];
