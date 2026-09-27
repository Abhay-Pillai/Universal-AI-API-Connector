const express = require('express');
const multer = require('multer');
const db = require('../db');
const { getAdapter, getApiKey } = require('../providers');
const { validateRequestInput, parseAndRepairJson, checkOutputAgainstSchema } = require('../utils/validate');
const { buildUserText } = require('../utils/promptBuilder');
const { estimateCost } = require('../utils/cost');
const { buildDocs } = require('./docsBuilder');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 } // 8MB per file
});

function getConnectorBySlug(slug) {
  const row = db.prepare('SELECT * FROM connectors WHERE slug = ?').get(slug);
  if (!row) return null;
  return {
    ...row,
    input_schema: JSON.parse(row.input_schema),
    output_schema: JSON.parse(row.output_schema)
  };
}

function logRequest(connectorId, { success, errorMessage, responseTimeMs, usage, cost, provider, model }) {
  db.prepare(`
    INSERT INTO logs
      (connector_id, timestamp, success, error_message, response_time_ms, input_tokens, output_tokens, total_tokens, estimated_cost, provider, model)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    connectorId,
    new Date().toISOString(),
    success ? 1 : 0,
    errorMessage || null,
    responseTimeMs || null,
    usage && usage.inputTokens != null ? usage.inputTokens : null,
    usage && usage.outputTokens != null ? usage.outputTokens : null,
    usage && usage.totalTokens != null ? usage.totalTokens : null,
    cost != null ? cost : null,
    provider,
    model
  );
}

// Public documentation - safe to share, never includes the real api_key.
router.get('/:slug/docs', (req, res) => {
  const connector = getConnectorBySlug(req.params.slug);
  if (!connector) return res.status(404).json({ success: false, error: 'Connector not found' });
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({ success: true, data: buildDocs(connector, baseUrl, { revealKey: false }) });
});

// The generated API endpoint. Accepts multipart/form-data (for image/file
// fields) or application/json. Requires an x-api-key header.
router.post('/:slug', upload.any(), express.json({ limit: '15mb' }), async (req, res) => {
  const started = Date.now();
  const connector = getConnectorBySlug(req.params.slug);

  if (!connector) {
    return res.status(404).json({ success: false, data: null, error: 'Connector not found' });
  }
  if (connector.status !== 'active') {
    return res.status(403).json({ success: false, data: null, error: 'This connector is currently disabled' });
  }

  const providedKey = req.get('x-api-key');
  if (!providedKey || providedKey !== connector.api_key) {
    return res.status(401).json({ success: false, data: null, error: 'Missing or invalid x-api-key header' });
  }

  // Build a map of uploaded files by field name (from multer .any())
  const filesByField = {};
  (req.files || []).forEach((f) => { filesByField[f.fieldname] = f; });

  const { errors, values } = validateRequestInput(connector.input_schema, req.body || {}, filesByField);
  if (errors.length) {
    logRequest(connector.id, {
      success: false,
      errorMessage: errors.join('; '),
      responseTimeMs: Date.now() - started,
      usage: {},
      cost: null,
      provider: connector.provider,
      model: connector.model
    });
    return res.status(400).json({ success: false, data: null, error: errors.join('; ') });
  }

  // Collect any image fields as base64 for vision-capable providers
  const images = [];
  for (const field of connector.input_schema) {
    if (field.type === 'image' && values[field.name] && values[field.name].buffer) {
      images.push({
        mimeType: values[field.name].mimetype,
        base64: values[field.name].buffer.toString('base64')
      });
      delete values[field.name];
    } else if (field.type === 'file' && values[field.name] && values[field.name].buffer) {
      // Non-image files are noted by name/type only in the prompt text.
      values[field.name] = `${values[field.name].originalname} (${values[field.name].mimetype})`;
    }
  }

  try {
    const userText = buildUserText(connector.input_schema, values, connector.output_schema);
    const apiKey = getApiKey(connector.provider);
    const adapter = getAdapter(connector.provider);

    const result = await adapter.generate({
      apiKey,
      model: connector.model,
      systemPrompt: connector.system_prompt,
      userText,
      images
    });

    const elapsed = Date.now() - started;
    const parsed = parseAndRepairJson(result.text);
    const cost = estimateCost(connector.provider, connector.model, result.usage.inputTokens, result.usage.outputTokens);

    logRequest(connector.id, {
      success: parsed.ok,
      errorMessage: parsed.ok ? null : 'AI response was not valid JSON',
      responseTimeMs: elapsed,
      usage: result.usage,
      cost,
      provider: connector.provider,
      model: connector.model
    });

    if (!parsed.ok) {
      return res.status(502).json({ success: false, data: null, error: 'The AI provider returned a response that could not be parsed as JSON' });
    }

    const warnings = checkOutputAgainstSchema(parsed.data, connector.output_schema);
    return res.json({ success: true, data: parsed.data, error: null, warnings: warnings.length ? warnings : undefined });
  } catch (e) {
    const elapsed = Date.now() - started;
    logRequest(connector.id, {
      success: false,
      errorMessage: e.message,
      responseTimeMs: elapsed,
      usage: {},
      cost: null,
      provider: connector.provider,
      model: connector.model
    });
    return res.status(e.status || 500).json({ success: false, data: null, error: 'The request could not be completed. Please try again later.' });
  }
});

module.exports = router;
