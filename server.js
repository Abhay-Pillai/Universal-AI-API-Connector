require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

const adminRoutes = require('./src/routes/admin');
const connectorRoutes = require('./src/routes/connectors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Public health check (useful for hosting providers)
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Admin login + management API (session-protected inside the router)
app.use('/api/admin', adminRoutes);

// Generated connector endpoints + public docs (per-connector API key protected)
app.use('/api/connectors', connectorRoutes);

// Static admin dashboard UI
app.use(express.static(path.join(__dirname, 'public')));

// Fallback 404 for unmatched API routes -> JSON, never a stack trace
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Generic error handler - never leak raw errors to the client
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, error: 'Uploaded file is too large (max 8MB)' });
  }
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`AI API Hub listening on port ${PORT}`);
  if (!process.env.JWT_SECRET) console.warn('WARNING: JWT_SECRET is not set - using an insecure default.');
  if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
    console.warn('WARNING: No provider API keys configured (GROQ_API_KEY / GEMINI_API_KEY).');
  }
});
