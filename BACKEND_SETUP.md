# Backend Server Setup for Archeos AI Worker

This document explains how to set up your own backend server to handle AI requests from the Cloudflare Worker.

## Overview

The `workers/analyze-artifact/index.ts` worker can now send HTTP requests to your own backend server instead of using Cloudflare AI binding. This allows you to use local models (like Ollama) or any custom AI backend.

## Configuration

Set these environment variables in `workers/analyze-artifact/wrangler.toml`:

```toml
[vars]
BACKEND_URL = "http://localhost:11434"  # Your backend URL
BACKEND_TYPE = "ollama"  # or "custom"
```

Or set them via Cloudflare dashboard secrets for production.

## Request Format

The worker sends POST requests to: `{BACKEND_URL}/api/chat`

### For Ollama Backend Type

**Request:**
```json
POST http://your-backend-url/api/chat
Content-Type: application/json

{
  "model": "llama3.2-vision:11b",
  "messages": [{
    "role": "user",
    "content": "Your prompt text here",
    "images": ["base64-encoded-image-without-data-prefix"]
  }],
  "stream": false,
  "options": {
    "num_predict": 4096
  }
}
```

**Expected Response:**
```json
{
  "message": {
    "content": "The AI generated text response"
  }
}
```

Or alternative Ollama format:
```json
{
  "response": "The AI generated text response"
}
```

### For Custom Backend Type

**Request:**
```json
POST http://your-backend-url/api/chat
Content-Type: application/json

{
  "prompt": "Your prompt text here",
  "image": "base64-encoded-image-without-data-prefix",
  "max_tokens": 4096,
  "stream": false
}
```

**Expected Response:**
```json
{
  "response": "The AI generated text response"
}
```

Or alternative formats:
```json
{
  "text": "The AI generated text response"
}
```

```json
{
  "output": "The AI generated text response"
}
```

## Example: Simple Express.js Backend

```javascript
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Ollama-style endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { model, messages, prompt, image, options } = req.body;
    
    let userPrompt = prompt;
    let base64Image = image;
    
    // Handle Ollama format
    if (messages && messages.length > 0) {
      userPrompt = messages[0].content;
      base64Image = messages[0].images ? messages[0].images[0] : null;
    }
    
    // TODO: Replace with your actual AI model call
    // Example: call your local model, API, etc.
    const response = await callYourAIModel(userPrompt, base64Image, options?.num_predict || 4096);
    
    // Return in Ollama format
    res.json({
      message: {
        content: response
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function callYourAIModel(prompt, base64Image, maxTokens) {
  // TODO: Implement your AI model call here
  // Example with Ollama:
  // const response = await fetch('http://localhost:11434/api/chat', {...});
  // return response.message.content;
  
  return "Your AI response here";
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
```

## Example: Using Ollama Directly

If you're using Ollama, you can point directly to it:

```toml
[vars]
BACKEND_URL = "http://localhost:11434"
BACKEND_TYPE = "ollama"
```

The worker will automatically format requests for Ollama's API.

## Image Format

- The worker strips the `data:image/jpeg;base64,` prefix before sending
- Your backend receives clean base64-encoded image data
- No data URI prefix - just the base64 string

## Testing

1. Start your backend server
2. Update `wrangler.toml` with your backend URL
3. Test locally: `cd workers/analyze-artifact && wrangler dev`
4. Send a test request to your worker

## Debugging

Check worker logs for:
- `Calling backend at: ...` - confirms backend URL is set
- `Backend response length: ...` - confirms successful response
- `Backend FAILED` - shows error details

Check your backend logs for incoming requests.
