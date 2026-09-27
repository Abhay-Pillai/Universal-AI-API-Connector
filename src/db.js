const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'apihub.sqlite'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS connectors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  input_schema TEXT NOT NULL,   -- JSON string: array of {name,type,required,description,default}
  output_schema TEXT NOT NULL,  -- JSON string: object schema {field: type}
  api_key TEXT NOT NULL,        -- key an external caller must send to use this connector
  status TEXT NOT NULL DEFAULT 'active', -- active | disabled
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  connector_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  success INTEGER NOT NULL,
  error_message TEXT,
  response_time_ms INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost REAL,
  provider TEXT,
  model TEXT,
  FOREIGN KEY (connector_id) REFERENCES connectors(id)
);

CREATE INDEX IF NOT EXISTS idx_logs_connector ON logs(connector_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
`);

module.exports = db;
