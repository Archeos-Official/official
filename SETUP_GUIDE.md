# Archeos Setup Guide - HTTP Version Only

## Overview

Archeos now uses **HTTP requests** to send image URLs + metadata to your backend server.

**Flow:**
```
Frontend → Cloudflare Worker → Your Backend URL → Ollama (or any AI)
```

---

## Setup: HTTP Version (Custom Backend)

### What it does:
- Frontend → Cloudflare Worker → Your Backend URL → Ollama (or any AI)

### Step 1: Create Your Backend Server

Create `backend-server.js`:

```javascript
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const OLLAMA_URL = 'http://localhost:11434';

// Main endpoint that receives requests from worker
app.post('/api/analyze', async (req, res) => {
  try {
    const { image_urls, metadata } = req.body;
    
    console.log('\n=== NEW REQUEST ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Image URLs:', image_urls);
    console.log('Metadata:', JSON.stringify(metadata, null, 2));
    
    // Fetch images from URLs (Supabase)
    const images = await Promise.all(
      image_urls.map(async (url) => {
        const response = await fetch(url);
        const buffer = await response.buffer();
        return buffer.toString('base64');
      })
    );
    
    // Build prompt from metadata
    const contextParts = [];
    if (metadata?.depth_found) contextParts.push(`Depth found: ${metadata.depth_found}`);
    if (metadata?.soil_type) contextParts.push(`Soil type: ${metadata.soil_type}`);
    if (metadata?.latitude) contextParts.push(`Location: ${metadata.latitude}, ${metadata.longitude}`);
    
    const prompt = `You are an expert archaeologist...\nContext: ${contextParts.join(', ')}\n\nAnalyze this artifact...`;
    
    // Send to Ollama llava
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llava',
        messages: [{
          role: 'user',
          content: prompt,
          images: images
        }],
        stream: false
      })
    });
    
    const data = await response.json();
    const result = parseResponse(data.message?.content || '');
    res.json(result);
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

function parseResponse(text) {
  // Parse the AI response to extract fields
  return {
    name: extractField(text, 'Name'),
    period: extractField(text, 'Period'),
    // ... parse other fields
  };
}

app.listen(3000, () => {
  console.log('Backend server running on http://localhost:3000');
});
```

### Step 2: Install Dependencies & Start Backend

```bash
npm install express cors node-fetch
node backend-server.js
```

### Step 3: Install & Start Ollama

```bash
# Install from https://ollama.com/

# Pull llava (vision model)
ollama pull llava

# Start Ollama
ollama serve
```

### Step 4: Configure Worker

Edit `workers/analyze-artifact/wrangler.toml`:

```toml
[vars]
BACKEND_URL = "http://localhost:3000"
USE_CLOUDFLARE_FALLBACK = "false"
```

### Step 5: Start Worker & Frontend

```bash
# Terminal 1: Start worker
cd workers/analyze-artifact
wrangler dev

# Terminal 2: Start frontend
npm run dev
```

### HTTP Request Format:

#### What the Worker Sends to Your Backend:

```json
POST http://localhost:3000/api/analyze
{
  "image_urls": ["https://supabase-url/image.jpg"],
  "metadata": {
    "depth_found": "shallow",
    "soil_type": "sandy",
    "latitude": 52.3676,
    "longitude": 4.9041
  }
}
```

#### Response Your Backend Should Return:

```json
{
  "name": "Roman bronze fibula",
  "period": "1st-3rd century AD",
  "origin": "Roman Empire",
  "material": "bronze",
  "description": "...",
  "historical_context": "...",
  "similar_finds": "...",
  "confidence": 85,
  "rarity": "uncommon"
}
```

---

## How to Host the Website Locally

### Prerequisites:
```bash
# Install Node.js from https://nodejs.org/

# Install dependencies
cd archeos-main
npm install
```

### Start Local Development:
```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start frontend
npm run dev
# → Website runs at http://localhost:5173

# Terminal 3: Start worker (if testing worker locally)
cd workers/analyze-artifact
wrangler dev
# → Worker runs at http://localhost:8787
```

### Environment Variables:
Create `.env.local` in root:
```
VITE_SUPABASE_URL=https://your-supabase-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_AI_WORKER_URL=http://localhost:8787
```

---

## Correct HTTP Handling (Avoid Interference)

### Problem: Multiple requests interfering with each other.

### Solution 1: Use Timestamps & Request IDs

```javascript
app.post('/api/analyze', async (req, res) => {
  const requestId = Date.now(); // Unique ID for this request
  console.log(`[${requestId}] NEW REQUEST`);
  
  try {
    const result = await processRequest(req.body, requestId);
    console.log(`[${requestId}] COMPLETED`);
    res.json(result);
  } catch (error) {
    console.error(`[${requestId}] ERROR:`, error);
    res.status(500).json({ error: error.message });
  }
});
```

### Solution 2: Use Async Processing (Queue)

```javascript
const requestQueue = [];
let processing = false;

async function processQueue() {
  if (processing || requestQueue.length === 0) return;
  processing = true;
  
  const { req, res, requestId } = requestQueue.shift();
  
  try {
    const result = await processRequest(req.body, requestId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  
  processing = false;
  processQueue();
}

app.post('/api/analyze', (req, res) => {
  const requestId = Date.now();
  requestQueue.push({ req, res, requestId });
  processQueue();
});
```

### Solution 3: Log Each Request Separately

```javascript
app.post('/api/analyze', async (req, res) => {
  const timestamp = new Date().toISOString();
  const separator = '='.repeat(50);
  
  console.log(`\n${separator}`);
  console.log(`[${timestamp}] NEW REQUEST`);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log(`${separator}\n`);
  
  // Process request...
});
```

---

## Quick Reference Table

| Aspect | HTTP Version |
|--------|---------------|
| **Backend** | Your custom server |
| **URL** | `localhost:3000` (or your URL) |
| **Setup** | More control |
| **Debugging** | Check your server logs |
| **Interference** | You control it |
| **Use Case** | Custom processing |

---

## TODO List for You

### Setup HTTP Version:
- [ ] Create `backend-server.js` (use template above)
- [ ] Install dependencies: `npm install express cors node-fetch`
- [ ] Start Ollama: `ollama serve`
- [ ] Pull llava: `ollama pull llava`
- [ ] Start backend: `node backend-server.js`
- [ ] Update `wrangler.toml` with `BACKEND_URL = "http://localhost:3000"`
- [ ] Start worker: `cd workers/analyze-artifact && wrangler dev`
- [ ] Start frontend: `npm run dev`
- [ ] Test: Upload image → Check backend console → Check Ollama terminal
- [ ] Verify request/response format matches expected structure

### Host Website Locally:
- [ ] Install Node.js
- [ ] Run `npm install` in project root
- [ ] Create `.env.local` with Supabase credentials
- [ ] Start Ollama: `ollama serve`
- [ ] Start frontend: `npm run dev`
- [ ] (If testing worker) Start worker: `wrangler dev`
- [ ] Open `http://localhost:5173` and test

### Correct HTTP Handling:
- [ ] Add timestamps/request IDs to backend logs
- [ ] Test multiple concurrent requests
- [ ] Verify requests don't interfere
- [ ] (Optional) Implement queue system if needed
