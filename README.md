# AI API Hub

A reusable platform for building, managing, testing, documenting, and exposing AI-powered API endpoints without writing a separate backend for every AI use case.

**AI API Hub** allows an administrator to create an AI connector by configuring a provider, model, input fields, system prompt, and output schema. Once created, the platform automatically exposes the connector as a secure HTTP API, generates API documentation, provides an integrated testing interface, and records usage statistics and request logs.

The platform follows a provider-adapter architecture, allowing multiple AI providers to be integrated without changing the core application.

---

## Features

* **Multi-provider AI support**

  * Google Gemini
  * Groq
  * Extensible provider-adapter architecture

* **Dynamic AI connector creation**

  * Connector name and description
  * AI provider and model selection
  * Custom system prompt
  * Dynamic input fields
  * Dynamic output schema

* **Multiple input types**

  * Text
  * Number
  * Boolean
  * Image
  * File
  * JSON

* **Structured AI responses**

  * Configurable JSON output schema
  * Automatic JSON parsing
  * Response validation
  * Basic response repair

* **Secure API access**

  * JWT-based administrator authentication
  * Individual API key for every connector
  * Provider API keys remain server-side
  * Generic error responses

* **Automatic API documentation**

  * Connector endpoint
  * Request format
  * Input parameters
  * Output structure
  * Example `curl` request

* **Integrated API testing**

  * Test connectors directly from the dashboard
  * View structured responses
  * View errors and execution information

* **Usage monitoring**

  * Request logs
  * Success/failure status
  * Token usage
  * Estimated cost
  * Response latency
  * First and last usage timestamps

* **Administration dashboard**

  * Connector management
  * Connector editing
  * Connector testing
  * Documentation
  * Statistics and logs
  * Model refresh

---

## Technology Stack

| Component      | Technology            |
| -------------- | --------------------- |
| Backend        | Node.js               |
| Web Framework  | Express.js            |
| Database       | SQLite                |
| SQLite Driver  | better-sqlite3        |
| Frontend       | HTML, CSS, JavaScript |
| Authentication | JWT                   |
| AI Provider 1  | Google Gemini         |
| AI Provider 2  | Groq                  |
| API Format     | REST / JSON           |
| Deployment     | Render                |
| Source Control | Git / GitHub          |

The frontend does not require a separate build process and is served directly by the Express application.

---

## System Architecture

```text
                         ┌─────────────────────────┐
                         │       Administrator      │
                         │     Web Dashboard       │
                         └────────────┬────────────┘
                                      │
                                      │ JWT Authentication
                                      ▼
                         ┌─────────────────────────┐
                         │      Express Server     │
                         │        server.js        │
                         └────────────┬────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
             ┌────────────┐   ┌──────────────┐  ┌──────────────┐
             │   Admin    │   │  Connector   │  │ Documentation│
             │   Routes   │   │    Routes    │  │    Builder   │
             └─────┬──────┘   └──────┬───────┘  └──────────────┘
                   │                 │
                   └────────┬────────┘
                            ▼
                  ┌────────────────────┐
                  │   Prompt Builder   │
                  │ Input Validation   │
                  │ Output Validation  │
                  └─────────┬──────────┘
                            │
                            ▼
                  ┌────────────────────┐
                  │ Provider Adapters  │
                  └─────────┬──────────┘
                            │
                  ┌─────────┴─────────┐
                  ▼                   ▼
          ┌──────────────┐    ┌──────────────┐
          │ Google       │    │    Groq      │
          │ Gemini       │    │    Models    │
          └──────────────┘    └──────────────┘

                            │
                            ▼
                  ┌────────────────────┐
                  │      SQLite        │
                  │ Connectors + Logs  │
                  └────────────────────┘
```

---

## Project Structure

```text
api-hub/
│
├── server.js
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
├── README.md
│
├── data/
│   └── .gitkeep
│
├── public/
│   ├── index.html
│   ├── dashboard.html
│   ├── connector-editor.html
│   ├── connector-detail.html
│   │
│   ├── css/
│   │   └── style.css
│   │
│   └── js/
│       └── api.js
│
└── src/
    ├── auth.js
    ├── db.js
    │
    ├── config/
    │   └── providers.js
    │
    ├── providers/
    │   ├── index.js
    │   ├── shared.js
    │   ├── gemini.js
    │   └── groq.js
    │
    ├── routes/
    │   ├── admin.js
    │   ├── connectors.js
    │   └── docsBuilder.js
    │
    └── utils/
        ├── cost.js
        ├── promptBuilder.js
        └── validate.js
```

### Important Modules

| File                         | Responsibility                                 |
| ---------------------------- | ---------------------------------------------- |
| `server.js`                  | Express application entry point and middleware |
| `src/db.js`                  | SQLite database and schema management          |
| `src/auth.js`                | Administrator authentication and JWT handling  |
| `src/config/providers.js`    | AI provider configuration and model registry   |
| `src/providers/gemini.js`    | Google Gemini provider adapter                 |
| `src/providers/groq.js`      | Groq provider adapter                          |
| `src/providers/index.js`     | Provider adapter registration                  |
| `src/routes/admin.js`        | Administrator APIs and connector management    |
| `src/routes/connectors.js`   | Public connector API endpoints                 |
| `src/routes/docsBuilder.js`  | Automatic API documentation generation         |
| `src/utils/promptBuilder.js` | Prompt construction                            |
| `src/utils/validate.js`      | Input and output validation                    |
| `src/utils/cost.js`          | Token/cost estimation                          |
| `public/`                    | Administrator dashboard and frontend           |

---

# Getting Started

## Prerequisites

Install:

* Node.js **22.x**
* npm
* Git

Node.js 22.x is recommended because the application uses `better-sqlite3`, a native Node.js module.

Verify the installation:

```bash
node --version
npm --version
```

Example:

```text
v22.x.x
10.x.x
```

---

# Installation

Clone the repository:

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
```

Enter the project directory:

```bash
cd api-hub
```

Install dependencies:

```bash
npm install
```

---

# Environment Configuration

Create the environment file:

### Windows

```cmd
copy .env.example .env
```

### macOS / Linux

```bash
cp .env.example .env
```

Configure `.env`:

```env
PORT=3000

JWT_SECRET=your-long-random-secret

ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-admin-password

GROQ_API_KEY=your-groq-api-key
GEMINI_API_KEY=your-gemini-api-key
```

### Environment Variables

| Variable         | Description                               |
| ---------------- | ----------------------------------------- |
| `PORT`           | Port used by the Express server           |
| `JWT_SECRET`     | Secret used to sign authentication tokens |
| `ADMIN_USERNAME` | Administrator login username              |
| `ADMIN_PASSWORD` | Administrator login password              |
| `GROQ_API_KEY`   | Groq provider API key                     |
| `GEMINI_API_KEY` | Google Gemini provider API key            |

> **Security:** Never commit `.env` to GitHub. Provider API keys and administrator credentials must remain in environment variables.

---

# AI Provider Configuration

AI API Hub currently supports two providers.

## Google Gemini

Gemini provides support for text and multimodal use cases such as image-based extraction.

Example model:

```text
gemini-3.8-flash
```

The provider key is configured using:

```env
GEMINI_API_KEY=your-key
```

## Groq

Groq provides fast inference for supported text-generation models.

Example model:

```text
llama-3.3-70b-versatile
```

The provider key is configured using:

```env
GROQ_API_KEY=your-key
```

---

# Running the Application

Start the application:

```bash
npm start
```

The server will run on:

```text
http://localhost:3000
```

Open the application in a browser:

```text
http://localhost:3000
```

The administrator can then log in using the credentials configured in `.env`.

---

# Creating an AI Connector

A connector defines how an AI-powered API endpoint behaves.

Each connector contains:

1. Connector name
2. Provider
3. AI model
4. System prompt
5. Input fields
6. Output schema
7. Generated API key
8. Public API endpoint

The workflow is:

```text
Create Connector
       ↓
Select AI Provider
       ↓
Select Model
       ↓
Define Input Fields
       ↓
Configure System Prompt
       ↓
Define Output Schema
       ↓
Save Connector
       ↓
Generated API Endpoint
       ↓
Test API
       ↓
Use External API
```

---

# Demonstration Connector 1

## Business Card Information Extractor

**Purpose:** Extract structured information from a business card image.

### Configuration

**Provider**

```text
Google Gemini
```

**Model**

```text
gemini-3.8-flash
```

### Input

```text
image
Type: image
Required: Yes
```

### System Prompt

```text
You are a business card extraction system. Extract the person's name,
company, designation, phone, email and website from the supplied image.
Return only valid JSON matching the configured output structure.
```

### Output Schema

```json
{
  "name": "string",
  "company": "string",
  "designation": "string",
  "phone": "string",
  "email": "string",
  "website": "string"
}
```

### Example Response

```json
{
  "success": true,
  "data": {
    "name": "Jane Doe",
    "company": "Example Technologies",
    "designation": "Software Engineer",
    "phone": "+91-9876543210",
    "email": "jane@example.com",
    "website": "https://example.com"
  },
  "error": null
}
```

---

# Demonstration Connector 2

## Article Generator

**Purpose:** Generate a structured article from a user-provided topic.

### Configuration

**Provider**

```text
Groq
```

**Model**

```text
llama-3.3-70b-versatile
```

### Input Fields

| Field        | Type   | Required | Default      |
| ------------ | ------ | -------- | ------------ |
| `topic`      | text   | Yes      | —            |
| `word_count` | number | No       | 300          |
| `tone`       | text   | No       | professional |

### System Prompt

```text
You are an article-writing assistant. Write a well structured article
on the given topic, matching the requested tone and approximate word
count. Return only valid JSON matching the configured output structure.
```

### Output Schema

```json
{
  "title": "string",
  "body": "string",
  "word_count": "number"
}
```

---

# Public API

Once a connector is created, AI API Hub generates a unique API endpoint.

```http
POST /api/connectors/:slug
```

Each connector has its own API key.

The API key must be provided using:

```http
x-api-key: YOUR_CONNECTOR_API_KEY
```

### Example

```bash
curl -X POST "https://YOUR-DOMAIN/api/connectors/business-card-extractor" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_CONNECTOR_API_KEY" \
  -d '{
    "image": "BASE64_ENCODED_IMAGE"
  }'
```

The exact endpoint, request structure, and `curl` command are automatically generated in the connector's **Documentation** section.

---

# API Response Format

Successful requests follow a structured format:

```json
{
  "success": true,
  "data": {
    "title": "Example Title",
    "body": "Generated content..."
  },
  "error": null
}
```

Failed requests follow:

```json
{
  "success": false,
  "data": null,
  "error": "Request could not be processed"
}
```

This provides a consistent response structure for applications consuming different AI connectors.

---

# Automatic Documentation

Every connector automatically receives API documentation containing:

* Connector description
* Endpoint URL
* HTTP method
* Authentication method
* Required API key header
* Input fields
* Output schema
* Example request
* Example response
* `curl` command

This allows an external developer to integrate a connector without inspecting the source code.

---

# Dashboard

The administrator dashboard provides the following functionality:

### Connector Management

* Create connectors
* Edit connectors
* View connectors
* Regenerate connector API keys
* Test connectors

### Test API

The built-in testing interface allows administrators to submit inputs and execute a connector without using an external API client.

### Documentation

Each connector provides automatically generated API documentation and an example `curl` request.

### Stats & Logs

The dashboard records:

* Request status
* Request time
* Response time
* Token usage
* Estimated cost
* First usage
* Last usage

---

# Database

The application uses SQLite through `better-sqlite3`.

The database stores application information such as:

```text
Connectors
Request Logs
Usage Statistics
```

Provider API keys are **not stored in the database**.

The SQLite database is stored inside the application's `data/` directory.

---

# Security

AI API Hub separates three different types of credentials.

### 1. Administrator Credentials

Used to access the management dashboard.

```text
ADMIN_USERNAME
ADMIN_PASSWORD
```

### 2. Provider API Keys

Used internally by the server to communicate with AI providers.

```text
GROQ_API_KEY
GEMINI_API_KEY
```

These keys never need to be exposed to the frontend.

### 3. Connector API Keys

Each connector receives an individual API key.

External applications provide this key through:

```http
x-api-key
```

This prevents public connector endpoints from being accessible without authentication.

### Additional Security Measures

* JWT-based administrator authentication
* HTTP-only authentication cookie
* Environment-based secrets
* Connector-specific API authentication
* Input validation
* Output validation
* Maximum uploaded file/image size
* Request timeout handling
* Generic external error messages
* No raw stack traces returned to API consumers

---

# Provider Adapter Architecture

AI providers are isolated using a provider-adapter pattern.

The application interacts with a common provider interface instead of directly depending on a specific AI provider.

Conceptually:

```text
                    AI API Hub
                        │
                 Provider Interface
                        │
             ┌──────────┴──────────┐
             │                     │
             ▼                     ▼
        Gemini Adapter         Groq Adapter
             │                     │
             ▼                     ▼
        Gemini API             Groq API
```

Adding another provider requires creating its adapter and registering it in the provider configuration.

The rest of the application can continue using the same provider interface.

---

# Prompt Processing

When an API request is received, the platform combines:

```text
System Prompt
      +
User Input
      +
Output Schema
      ↓
Generated AI Prompt
```

The AI response is then:

```text
AI Response
    ↓
JSON Parsing
    ↓
Response Validation
    ↓
Schema Validation
    ↓
Structured API Response
```

This allows different connectors to use different prompts and schemas while sharing the same backend infrastructure.

---

# Error Handling

The application handles:

* Invalid input
* Missing required fields
* Invalid JSON
* AI provider errors
* Model errors
* Timeout errors
* Invalid AI output
* Output schema mismatches

External API consumers receive a controlled error response instead of internal stack traces.

---

# Deployment

## Recommended Platform: Render

AI API Hub can be deployed as a Node.js Web Service.

### 1. Push the project to GitHub

```bash
git add .
git commit -m "Deploy AI API Hub"
git push
```

### 2. Create a Render Web Service

In Render:

```text
New +
   ↓
Web Service
   ↓
Connect GitHub Repository
```

Select the AI API Hub repository.

### 3. Configure the service

**Runtime**

```text
Node
```

**Build Command**

```text
npm install
```

**Start Command**

```text
npm start
```

### 4. Node.js Version

Because the application uses `better-sqlite3`, use Node.js 22.x.

Configure:

```text
NODE_VERSION=22.23.3
```

If using a `.node-version` file:

```text
22.23.3
```

### 5. Configure Environment Variables

Add the following in the Render environment settings:

```text
PORT
JWT_SECRET
ADMIN_USERNAME
ADMIN_PASSWORD
GROQ_API_KEY
GEMINI_API_KEY
NODE_VERSION
```

Do not upload the local `.env` file.

### 6. Deploy

After deployment, Render provides a public URL:

```text
https://your-service.onrender.com
```

---

# Deployment Verification

After deployment, verify the health endpoint:

```http
GET /health
```

Expected response:

```json
{
  "status": "ok"
}
```

Then verify:

1. Administrator login
2. Connector creation
3. Connector API test
4. Generated documentation
5. Public API endpoint
6. Connector API-key authentication
7. Request logging
8. Usage statistics

---

# SQLite Deployment Consideration

The application uses SQLite for simplicity and portability.

On free cloud hosting, local filesystem storage may not provide permanent database persistence across every deployment or infrastructure restart.

For a demonstration or evaluation deployment, SQLite is sufficient.

For production use, the database layer can be migrated to a managed database such as PostgreSQL while keeping the rest of the architecture largely unchanged.

---

# GitHub Security

The following files must not be committed:

```text
.env
node_modules/
data/*.sqlite
data/*.sqlite-*
*.log
```

The `.gitignore` file is configured to exclude these files.

Never publish:

* AI provider API keys
* Administrator passwords
* Connector API keys
* JWT secrets

If a secret is accidentally committed, revoke and regenerate it immediately.

---

# Current Implementation

The current implementation includes:

* Multi-provider AI architecture
* Google Gemini integration
* Groq integration
* Dynamic connector creation
* Dynamic input configuration
* Text, number, boolean, image, file and JSON inputs
* Dynamic output schemas
* Prompt generation
* Structured JSON responses
* JSON parsing and validation
* AI response repair
* Connector-specific API keys
* JWT administrator authentication
* REST API endpoints
* Automatic API documentation
* Example `curl` generation
* Integrated API testing
* SQLite request logging
* Token usage tracking
* Estimated cost calculation
* Response latency tracking
* Statistics dashboard
* Model refresh
* Generic error handling
* Public connector endpoints

---

# Future Enhancements

Potential future improvements include:

* API versioning
* Rate limiting per connector API key
* Request quota management
* Provider fallback and automatic retry
* Webhook support
* Connector import/export
* API key hashing
* Managed PostgreSQL support
* Advanced analytics
* Role-based administrator access
* Usage-based billing
* Additional AI providers

---

# Demonstration Flow

For a project evaluation or demonstration, the recommended flow is:

```text
1. Login
   ↓
2. Dashboard
   ↓
3. Create Gemini Business Card Connector
   ↓
4. Configure Image Input
   ↓
5. Configure JSON Output Schema
   ↓
6. Save Connector
   ↓
7. Test API with Business Card Image
   ↓
8. Show Structured JSON Response
   ↓
9. Show Automatically Generated Documentation
   ↓
10. Show Generated API Endpoint
   ↓
11. Create Groq Article Generator
   ↓
12. Test Text-Based AI Connector
   ↓
13. Show Stats & Logs
   ↓
14. Demonstrate External API Request
```

This demonstrates that AI API Hub is not limited to one AI model or one use case, but acts as a reusable platform for exposing different AI capabilities through standardized APIs.

---

# Project Objective

The objective of AI API Hub is to provide a centralized abstraction layer between applications and AI providers.

Instead of developing a separate backend implementation for every AI-powered feature, developers can configure reusable connectors through the platform and expose them as standardized APIs.

```text
Application
     │
     ▼
AI API Hub
     │
     ├── Connector 1 → Gemini → Image Extraction
     │
     ├── Connector 2 → Groq → Article Generation
     │
     ├── Connector 3 → Future Provider
     │
     └── Connector N → Future AI Use Case
```

This architecture simplifies AI integration, promotes reuse, provides centralized monitoring, and allows additional AI providers and use cases to be added without redesigning the entire application.

---
