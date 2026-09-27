// Builds the final user-turn text sent to the AI model, from the connector's
// input field definitions + the actual values submitted by the caller, plus
// an explicit instruction to return JSON matching the configured output schema.

function buildUserText(inputSchema, values, outputSchema) {
  const lines = [];

  for (const field of inputSchema) {
    if (field.type === 'image' || field.type === 'file') continue; // sent separately as binary
    const val = values[field.name];
    if (val === undefined || val === null || val === '') continue;
    lines.push(`${field.name} (${field.type}): ${typeof val === 'object' ? JSON.stringify(val) : val}`);
  }

  const schemaDescription = Object.entries(outputSchema)
    .map(([key, type]) => `  "${key}": ${type}`)
    .join(',\n');

  lines.push('');
  lines.push('Respond with ONLY a single valid JSON object (no markdown fences, no extra commentary) matching exactly this structure:');
  lines.push(`{\n${schemaDescription}\n}`);

  return lines.join('\n');
}

module.exports = { buildUserText };
