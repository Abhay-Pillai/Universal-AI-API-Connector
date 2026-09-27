const ALLOWED_TYPES = ['text', 'number', 'boolean', 'image', 'file', 'json'];

// Validates a connector definition submitted by the admin.
function validateConnectorDefinition(body) {
  const errors = [];
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    errors.push('name is required');
  }
  if (!body.provider) errors.push('provider is required');
  if (!body.model) errors.push('model is required');
  if (!body.system_prompt || !body.system_prompt.trim()) errors.push('system_prompt is required');

  if (!Array.isArray(body.input_schema) || body.input_schema.length === 0) {
    errors.push('input_schema must be a non-empty array');
  } else {
    body.input_schema.forEach((f, i) => {
      if (!f.name) errors.push(`input_schema[${i}].name is required`);
      if (!ALLOWED_TYPES.includes(f.type)) {
        errors.push(`input_schema[${i}].type must be one of ${ALLOWED_TYPES.join(', ')}`);
      }
    });
    const names = body.input_schema.map((f) => f.name);
    if (new Set(names).size !== names.length) errors.push('input_schema field names must be unique');
  }

  if (!body.output_schema || typeof body.output_schema !== 'object' || Array.isArray(body.output_schema) || Object.keys(body.output_schema).length === 0) {
    errors.push('output_schema must be a non-empty object, e.g. {"name":"string"}');
  }

  return errors;
}

// Validates incoming request body/files against a connector's input_schema.
// `files` is a map of fieldName -> multer file object (for image/file types).
function validateRequestInput(inputSchema, body, files) {
  const errors = [];
  const values = {};

  for (const field of inputSchema) {
    const isFileType = field.type === 'image' || field.type === 'file';
    const raw = isFileType ? files[field.name] : body[field.name];
    const missing = raw === undefined || raw === null || raw === '';

    if (missing) {
      if (field.required) {
        errors.push(`Missing required field: ${field.name}`);
      } else if (field.default !== undefined && field.default !== null && field.default !== '') {
        values[field.name] = field.default;
      }
      continue;
    }

    switch (field.type) {
      case 'number': {
        const n = Number(raw);
        if (Number.isNaN(n)) errors.push(`Field "${field.name}" must be a number`);
        else values[field.name] = n;
        break;
      }
      case 'boolean': {
        if (typeof raw === 'boolean') values[field.name] = raw;
        else if (raw === 'true' || raw === 'false') values[field.name] = raw === 'true';
        else errors.push(`Field "${field.name}" must be a boolean`);
        break;
      }
      case 'json': {
        if (typeof raw === 'object') { values[field.name] = raw; break; }
        try { values[field.name] = JSON.parse(raw); }
        catch (e) { errors.push(`Field "${field.name}" must be valid JSON`); }
        break;
      }
      case 'image':
      case 'file': {
        values[field.name] = raw; // multer file object, handled by caller
        break;
      }
      default: {
        values[field.name] = String(raw);
      }
    }
  }

  return { errors, values };
}

// Attempts to pull a valid JSON object out of raw AI text, stripping common
// wrappers like markdown code fences ("response repair" bonus feature).
function parseAndRepairJson(rawText) {
  if (!rawText) return { ok: false, data: null };

  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```(json)?/i, '').replace(/```$/, '').trim();

  try {
    return { ok: true, data: JSON.parse(cleaned) };
  } catch (e) {
    // Fall back: grab the first {...} block in the text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return { ok: true, data: JSON.parse(match[0]) };
      } catch (e2) { /* fall through */ }
    }
    return { ok: false, data: null };
  }
}

// Best-effort structural check of the parsed AI output against output_schema.
// Non-fatal: returns a list of warnings rather than blocking the response,
// since AI output is inherently a little unpredictable.
function checkOutputAgainstSchema(parsed, outputSchema) {
  const warnings = [];
  for (const [key, type] of Object.entries(outputSchema)) {
    if (!(key in parsed)) {
      warnings.push(`Missing expected field "${key}" in AI response`);
      continue;
    }
    const val = parsed[key];
    const actualType = Array.isArray(val) ? 'array' : typeof val;
    const expected = String(type).toLowerCase();
    if (expected === 'string' && actualType !== 'string') warnings.push(`Field "${key}" expected string, got ${actualType}`);
    if (expected === 'number' && actualType !== 'number') warnings.push(`Field "${key}" expected number, got ${actualType}`);
    if (expected === 'boolean' && actualType !== 'boolean') warnings.push(`Field "${key}" expected boolean, got ${actualType}`);
    if (expected === 'array' && actualType !== 'array') warnings.push(`Field "${key}" expected array, got ${actualType}`);
  }
  return warnings;
}

module.exports = {
  ALLOWED_TYPES,
  validateConnectorDefinition,
  validateRequestInput,
  parseAndRepairJson,
  checkOutputAgainstSchema
};
