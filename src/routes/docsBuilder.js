function buildDocs(connector, baseUrl, { revealKey = false } = {}) {
  const endpoint = `${baseUrl}/api/connectors/${connector.slug}`;
  const keyPlaceholder = revealKey ? connector.api_key : 'YOUR_API_KEY';

  const hasFile = connector.input_schema.some((f) => f.type === 'image' || f.type === 'file');

  let exampleCurl;
  if (hasFile) {
    const parts = connector.input_schema.map((f) => {
      if (f.type === 'image' || f.type === 'file') return `  -F "${f.name}=@/path/to/your/file"`;
      return `  -F "${f.name}=${exampleValueFor(f)}"`;
    });
    exampleCurl = [
      `curl -X POST "${endpoint}" \\`,
      `  -H "x-api-key: ${keyPlaceholder}" \\`,
      ...parts.map((p, i) => (i === parts.length - 1 ? p : `${p} \\`))
    ].join('\n');
  } else {
    const exampleBody = {};
    connector.input_schema.forEach((f) => { exampleBody[f.name] = exampleValueFor(f); });
    exampleCurl = [
      `curl -X POST "${endpoint}" \\`,
      `  -H "x-api-key: ${keyPlaceholder}" \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -d '${JSON.stringify(exampleBody)}'`
    ].join('\n');
  }

  const exampleResponse = {
    success: true,
    data: connector.output_schema,
    error: null
  };

  return {
    name: connector.name,
    description: connector.description,
    endpoint: {
      url: endpoint,
      method: 'POST',
      content_type: hasFile ? 'multipart/form-data' : 'application/json'
    },
    authentication: {
      header: 'x-api-key',
      description: 'Send your connector API key in the x-api-key header on every request.'
    },
    provider: connector.provider,
    model: connector.model,
    status: connector.status,
    parameters: connector.input_schema.map((f) => ({
      name: f.name,
      type: f.type,
      required: Boolean(f.required),
      description: f.description || '',
      default: f.default !== undefined ? f.default : null
    })),
    output_schema: connector.output_schema,
    example_request_curl: exampleCurl,
    example_success_response: exampleResponse,
    example_error_response: {
      success: false,
      data: null,
      error: 'Missing required field: <field_name>'
    },
    error_responses: [
      { status: 401, meaning: 'Missing or invalid x-api-key header' },
      { status: 400, meaning: 'Invalid or missing input parameters' },
      { status: 404, meaning: 'Connector not found or disabled' },
      { status: 502, meaning: 'The AI provider returned an error or an unparseable response' },
      { status: 504, meaning: 'The AI provider timed out' }
    ]
  };
}

function exampleValueFor(field) {
  if (field.default !== undefined && field.default !== null && field.default !== '') return field.default;
  switch (field.type) {
    case 'number': return 42;
    case 'boolean': return true;
    case 'json': return { example: 'value' };
    default: return `example ${field.name}`;
  }
}

module.exports = { buildDocs };
