# Ollama llava Setup Guide for Archeos

## Overview

Your Cloudflare Worker now sends image URLs + metadata to your backend URL. 
This guide shows you how to set up Ollama llava to receive and process these requests correctly.

## Step 1: Install & Start Ollama

```bash
# 1. Install Ollama from https://ollama.com/

# 2. Pull the llava model (vision model)
ollama pull llava

# 3. Start Ollama server (if not already running)
ollama serve
```

Ollama runs on `http://localhost:11434` by default.

## Step 2: Configure the Worker

Update `workers/analyze-artifact/wrangler.toml`:

```toml
[vars]
BACKEND_URL = "http://localhost:11434"
BACKEND_TYPE = "ollama"
USE_CLOUDFLARE_FALLBACK = "false"
```

This tells the worker to send requests directly to Ollama.

## Step 3: Understand the HTTP Request Format

### What the Worker Sends to Ollama:

The worker sends POST requests to `http://localhost:11434/api/chat` with this format:

```json
POST http://localhost:11434/api/chat
Content-Type: application/json

{
  "model": "llava",
  "messages": [{
    "role": "user",
    "content": "You are an expert archaeologist...\n\nContext: Depth found: shallow, Soil type: sandy...\n\nAnalyze this artifact...",
    "images": ["https://supabase-url/image.jpg"]
  }],
  "stream": false,
  "options": {
    "num_predict": 4096
  }
}
```

### Key Points:

1. **Images are URLs**, not base64 (Ollama can fetch URLs directly)
2. **Metadata is in the prompt text** (depth, soil, location, etc.)
3. **Model is "llava"** (vision model for images)
4. **stream: false** (we want complete response)

## Step 4: Handle Multiple Requests (No Interference)

Ollama handles concurrent requests automatically, but to avoid interference:

### Option A: Use Ollama Directly (Simple)

No extra backend needed. The worker sends requests directly to Ollama at `localhost:11434`.

**Pros:** Simple, no extra server needed
**Cons:** Ollama must be accessible from your worker

### Option B: Create a Simple Proxy Backend (Recommended)

Create a small Node.js server that:
1. Receives requests from worker
2. Logs/debugs the request
3. Forwards to Ollama
4. Returns response

This prevents request interference and lets you debug easier.

## Step 5: Create a Simple Proxy Backend (Optional but Recommended)

Create a file `proxy-server.js`:

```javascript
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const OLLAMA_URL = 'http://localhost:11434';

// Debug endpoint - logs everything
app.post('/api/chat', async (req, res) => {
  try {
    console.log('\n=== NEW REQUEST ===');
    console.log('Time:', new Date().toISOString());
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Forward to Ollama
    console.log('Forwarding to Ollama...');
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    console.log('Ollama response:', JSON.stringify(data, null, 2));
    
    res.json(data);
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Proxy server running on http://localhost:3000');
  console.log('Forwards requests to Ollama at', OLLAMA_URL);
});
```

### Install dependencies:

```bash
npm install express cors node-fetch
node proxy-server.js
```

### Update wrangler.toml to use proxy:

```toml
[vars]
BACKEND_URL = "http://localhost:3000"
BACKEND_TYPE = "ollama"
```

## Step 6: Test the Setup

### 1. Start Ollama:
```bash
ollama serve
```

### 2. Start proxy server (if using):
```bash
node proxy-server.js
```

### 3. Start worker locally:
```bash
cd workers/analyze-artifact
wrangler dev
```

### 4. Test in browser:
1. Open your frontend
2. Upload an artifact image
3. Fill in context (depth, soil, etc.)
4. Select location on map
5. Click "Analyze with AI"
6. Check **F12 console** for the HTTP request being sent
7. Check proxy server console (or Ollama console) for the incoming request

## Step 7: Verify Request/Response Format

### Expected Request (in F12 console):
```
=== F12 DEBUG: HTTP Request to Ollama ===
URL: http://localhost:11434/api/chat
Method: POST
Headers: { "Content-Type": "application/json" }
Body: {
  "model": "llava",
  "messages": [...],
  "stream": false
}
=== END DEBUG ===
```

### Expected Response from Ollama:
```json
{
  "message": {
    "content": "**Name:** Roman bronze fibula\n**Period:** 1st-3rd century AD\n..."
  }
}
```

## Troubleshooting

### "Connection refused" error:
- Make sure Ollama is running: `ollama serve`
- Check if port 11434 is accessible: `curl http://localhost:11434`

### "Model not found" error:
- Pull llava: `ollama pull llava`
- Check available models: `ollama list`

### Multiple requests interfering:
- Use the proxy server approach (Option B above)
- The proxy logs each request separately with timestamps
- Ollama processes requests sequentially by default

### Images not loading:
- Make sure Supabase image URLs are public
- Check if Ollama can access the URLs (try opening in browser)
- Check proxy server logs for the image URLs being sent

## Quick Reference

| Component | URL | Purpose |
|-----------|-----|---------|
| Ollama | `http://localhost:11434` | AI model (llava) |
| Proxy Server (optional) | `http://localhost:3000` | Debug/log requests |
| Worker | Cloudflare | Forwards to backend |
| Frontend | `http://localhost:5173` | User interface |

## TODO List for You

- [ ] Install Ollama and pull llava model
- [ ] Start Ollama server (`ollama serve`)
- [ ] Decide: Use Ollama directly OR create proxy server
- [ ] If using proxy: Create `proxy-server.js` and install dependencies
- [ ] Update `wrangler.toml` with correct BACKEND_URL
- [ ] Start worker locally: `cd workers/analyze-artifact && wrangler dev`
- [ ] Test with frontend: Upload image → Check F12 console → Check proxy/Ollama logs
- [ ] Verify response format matches expected structure
- [ ] If issues: Check F12 console, proxy logs, Ollama logs
