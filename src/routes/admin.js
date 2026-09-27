const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../db');
const { setAuthCookie, clearAuthCookie, requireAdmin } = require('../auth');
const { providerConfigs, getAdapter, getApiKey, getConfig } = require('../providers');
const { validateConnectorDefinition } = require('../utils/validate');
const { buildUserText } = require('../utils/promptBuilder');
const { parseAndRepairJson, checkOutputAgainstSchema } = require('../utils/validate');
const { estimateCost } = require('../utils/cost');

const router = express.Router();

// ---------- Auth ----------

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const okUser = username === process.env.ADMIN_USERNAME;
  const okPass = password === process.env.ADMIN_PASSWORD;
  if (!okUser || !okPass) {
    return res.status(401).json({ success: false, error: 'Invalid username or password' });
  }
  setAuthCookie(res, { username });
  res.json({ success: true });
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true });
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ success: true, admin: req.admin });
});

// Everything below requires a valid admin session
router.use(requireAdmin);

// ---------- Providers ----------

router.get('/providers', (req, res) => {
  const list = providerConfigs.map((p) => ({
    key: p.key,
    label: p.label,
    supportsImages: p.supportsImages,
    keyInfoUrl: p.keyInfoUrl,
    defaultModels: p.defaultModels,
    configured: Boolean(process.env[p.envVar])
  }));
  res.json({ success: true, data: list });
});

router.post('/providers/:key/refresh-models', async (req, res) => {
  try {
    const cfg = getConfig(req.params.key);
    if (!cfg) return res.status(404).json({ success: false, error: 'Unknown provider' });
    const apiKey = getApiKey(req.params.key);
    if (!apiKey) return res.status(400).json({ success: false, error: `${cfg.envVar} is not set on the server` });
    const adapter = getAdapter(req.params.key);
    const models = await adapter.listModels(apiKey);
    res.json({ success: true, data: models });
  } catch (e) {
    res.status(502).json({ success: false, error: e.message });
  }
});

// ---------- Connector CRUD ----------

function rowToConnector(row, { includeKey = false } = {}) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    provider: row.provider,
    model: row.model,
    system_prompt: row.system_prompt,
    input_schema: JSON.parse(row.input_schema),
    output_schema: JSON.parse(row.output_schema),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    ...(includeKey ? { api_key: row.api_key } : {})
  };
}

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'connector';
}

router.get('/connectors', (req, res) => {
  const rows = db.prepare('SELECT * FROM connectors ORDER BY created_at DESC').all();
  const summaryStmt = db.prepare(`
    SELECT
      COUNT(*) as total_requests,
      SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_requests,
      SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_requests,
      MAX(timestamp) as last_used
    FROM logs WHERE connector_id = ?
  `);
  const data = rows.map((row) => {
    const summary = summaryStmt.get(row.id);
    return { ...rowToConnector(row), stats: summary };
  });
  res.json({ success: true, data });
});

router.get('/connectors/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM connectors WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ success: false, error: 'Connector not found' });
  res.json({ success: true, data: rowToConnector(row, { includeKey: true }) });
});

router.post('/connectors', (req, res) => {
  const body = req.body || {};
  const errors = validateConnectorDefinition(body);
  if (errors.length) return res.status(400).json({ success: false, error: errors.join('; ') });

  const id = nanoid();
  let slug = slugify(body.name);
  const existing = db.prepare('SELECT id FROM connectors WHERE slug = ?').get(slug);
  if (existing) slug = `${slug}-${id.slice(0, 5).toLowerCase()}`;

  const apiKey = `sk_${nanoid(32)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO connectors
      (id, name, slug, description, provider, model, system_prompt, input_schema, output_schema, api_key, status, created_at, updated_at)
    VALUES (@id, @name, @slug, @description, @provider, @model, @system_prompt, @input_schema, @output_schema, @api_key, @status, @created_at, @updated_at)
  `).run({
    id,
    name: body.name.trim(),
    slug,
    description: body.description || '',
    provider: body.provider,
    model: body.model,
    system_prompt: body.system_prompt,
    input_schema: JSON.stringify(body.input_schema),
    output_schema: JSON.stringify(body.output_schema),
    api_key: apiKey,
    status: body.status === 'disabled' ? 'disabled' : 'active',
    created_at: now,
    updated_at: now
  });

  const row = db.prepare('SELECT * FROM connectors WHERE id = ?').get(id);
  res.status(201).json({ success: true, data: rowToConnector(row, { includeKey: true }) });
});

router.put('/connectors/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM connectors WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: 'Connector not found' });

  const body = req.body || {};
  const errors = validateConnectorDefinition(body);
  if (errors.length) return res.status(400).json({ success: false, error: errors.join('; ') });

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE connectors SET
      name = @name,
      description = @description,
      provider = @provider,
      model = @model,
      system_prompt = @system_prompt,
      input_schema = @input_schema,
      output_schema = @output_schema,
      status = @status,
      updated_at = @updated_at
    WHERE id = @id
  `).run({
    id: req.params.id,
    name: body.name.trim(),
    description: body.description || '',
    provider: body.provider,
    model: body.model,
    system_prompt: body.system_prompt,
    input_schema: JSON.stringify(body.input_schema),
    output_schema: JSON.stringify(body.output_schema),
    status: body.status === 'disabled' ? 'disabled' : 'active',
    updated_at: now
  });

  const row = db.prepare('SELECT * FROM connectors WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: rowToConnector(row, { includeKey: true }) });
});

router.delete('/connectors/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM connectors WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: 'Connector not found' });
  db.prepare('DELETE FROM logs WHERE connector_id = ?').run(req.params.id);
  db.prepare('DELETE FROM connectors WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/connectors/:id/regenerate-key', (req, res) => {
  const existing = db.prepare('SELECT * FROM connectors WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: 'Connector not found' });
  const apiKey = `sk_${nanoid(32)}`;
  db.prepare('UPDATE connectors SET api_key = ?, updated_at = ? WHERE id = ?')
    .run(apiKey, new Date().toISOString(), req.params.id);
  res.json({ success: true, data: { api_key: apiKey } });
});

// ---------- Test API (from the admin dashboard, no external api_key needed) ----------

router.post('/connectors/:id/test', express.json({ limit: '15mb' }), async (req, res) => {
  const row = db.prepare('SELECT * FROM connectors WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ success: false, error: 'Connector not found' });

  const connector = rowToConnector(row);
  const body = req.body && req.body.values ? req.body.values : {};
  const images = req.body && Array.isArray(req.body.images) ? req.body.images : [];

  const started = Date.now();
  try {
    const userText = buildUserText(connector.input_schema, body, connector.output_schema);
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
    const parsedResult = parseAndRepairJson(result.text);
    const warnings = parsedResult.ok ? checkOutputAgainstSchema(parsedResult.data, connector.output_schema) : [];
    const cost = estimateCost(connector.provider, connector.model, result.usage.inputTokens, result.usage.outputTokens);

    logRequest(connector.id, {
      success: parsedResult.ok,
      errorMessage: parsedResult.ok ? null : 'AI response was not valid JSON',
      responseTimeMs: elapsed,
      usage: result.usage,
      cost,
      provider: connector.provider,
      model: connector.model
    });

    res.json({
      success: parsedResult.ok,
      data: parsedResult.ok ? parsedResult.data : null,
      error: parsedResult.ok ? null : 'AI response was not valid JSON',
      raw_text: result.text,
      warnings,
      usage: result.usage,
      estimated_cost: cost,
      response_time_ms: elapsed
    });
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
    res.status(e.status || 500).json({ success: false, data: null, error: e.message, response_time_ms: elapsed });
  }
});

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

// ---------- Stats & Logs ----------

router.get('/connectors/:id/stats', (req, res) => {
  const row = db.prepare('SELECT * FROM connectors WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ success: false, error: 'Connector not found' });

  const summary = db.prepare(`
    SELECT
      COUNT(*) as total_requests,
      SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_requests,
      SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_requests,
      MIN(timestamp) as first_used,
      MAX(timestamp) as last_used,
      AVG(response_time_ms) as avg_response_time_ms,
      SUM(input_tokens) as total_input_tokens,
      SUM(output_tokens) as total_output_tokens,
      SUM(total_tokens) as total_tokens,
      SUM(estimated_cost) as total_estimated_cost
    FROM logs WHERE connector_id = ?
  `).get(req.params.id);

  res.json({ success: true, data: summary });
});

router.get('/connectors/:id/logs', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const rows = db.prepare('SELECT * FROM logs WHERE connector_id = ? ORDER BY id DESC LIMIT ?')
    .all(req.params.id, limit);
  res.json({ success: true, data: rows });
});

// ---------- Docs (admin view - includes the real api_key) ----------

router.get('/connectors/:id/docs', (req, res) => {
  const row = db.prepare('SELECT * FROM connectors WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ success: false, error: 'Connector not found' });
  const { buildDocs } = require('./docsBuilder');
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const docs = buildDocs(rowToConnector(row, { includeKey: true }), baseUrl, { revealKey: true });
  res.json({ success: true, data: docs });
});

module.exports = router;
