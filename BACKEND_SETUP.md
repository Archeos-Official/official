# Backend Server Setup for Archeos AI Worker

This document explains how to set up your own backend server to handle AI requests from the Cloudflare Worker.

## Overview

The `workers/analyze-artifact/index.ts` worker now sends HTTP requests with **image URLs and metadata** to your backend server instead of using Cloudflare AI binding. This allows you to use local models (like Ollama) or any custom AI backend.

## Configuration

Set these environment variables in `workers/analyze-artifact/wrangler.toml`:

```toml
[vars]
BACKEND_URL = "http://localhost:3000"
BACKEND_TYPE = "custom"  # or "ollama"
```

Or set them via Cloudflare dashboard secrets for production.

## Request Format

The worker sends POST requests to: `{BACKEND_URL}/api/analyze`

### Request Body (Custom Backend)

```json
POST http://your-backend-url/api/analyze
Content-Type: application/json

{
  "image_urls": [
    "https://supabase-url/image1.jpg",
    "https://supabase-url/image2.jpg"
  ],
  "metadata": {
    "depth_found": "shallow",
    "soil_type": "sandy",
    "condition": "good",
    "detection_method": "metal_detector",
    "material": "bronze",
    "latitude": 52.3676,
    "longitude": 4.9041
  }
}
```

### Request Body (Ollama Backend Type)

```json
POST http://your-backend-url/api/chat
Content-Type: application/json

{
  "model": "llama3.2-vision:11b",
  "prompt": "You are an expert archaeologist...\n\nContext: Depth found: shallow, Soil type: sandy...\n\nAnalyze this artifact...",
  "images": [
    "https://supabase-url/image1.jpg"
  ],
  "stream": false,
  "options": {
    "num_predict": 4096
  }
}
```

## Expected Response Format

Your backend should return one of these formats:

### Format 1: Structured JSON (Recommended)

```json
{
  "name": "Roman bronze fibula",
  "period": "1st-3rd century AD",
  "origin": "Roman Empire",
  "material": "bronze",
  "description": "A small bronze fibula with bow-shaped arch...",
  "historical_context": "Fibulae were used as clothing fasteners...",
  "similar_finds": "Similar finds in Roman Britain database...",
  "confidence": 85,
  "rarity": "uncommon"
}
```

### Format 2: Text Response (Ollama-style)

```json
{
  "message": {
    "content": "**Name:** Roman bronze fibula\n**Period:** 1st-3rd century AD\n..."
  }
}
```

### Format 3: Simple Text Response

```json
{
  "response": "**Name:** Roman bronze fibula\n**Period:** 1st-3rd century AD\n..."
}
```

## Image Handling

- Your backend receives **image URLs**, not base64
- You need to fetch the images from the URLs (they're publicly accessible Supabase URLs)
- Example: `fetch(image_urls[0])` to get the image data

## Example: Simple Express.js Backend

```javascript
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.post('/api/analyze', async (req, res) => {
  try {
    const { image_urls, metadata } = req.body;
    
    console.log('Received image URLs:', image_urls);
    console.log('Received metadata:', metadata);
    
    // Fetch images from URLs
    const images = await Promise.all(
      image_urls.map(async (url) => {
        const response = await fetch(url);
        const buffer = await response.buffer();
        return buffer.toString('base64'); // Convert to base64 for your AI model
      })
    );
    
    // TODO: Call your AI model with images and metadata
    // Example: const result = await analyzeWithAI(images, metadata);
    const result = await callYourAIModel(images, metadata);
    
    // Return structured JSON
    res.json(result);
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function callYourAIModel(images, metadata) {
  // TODO: Implement your AI model call here
  // Use images (base64) and metadata (context) to analyze
  
  // Example with Ollama:
  // const response = await fetch('http://localhost:11434/api/chat', {
  //   method: 'POST',
  //   body: JSON.stringify({
  //     model: 'llama3.2-vision:11b',
  //     messages: [{
  //       role: 'user',
  //       content: buildPrompt(metadata),
  //       images: images
  //     }],
  //     stream: false
  //   })
  // });
  // const data = await response.json();
  // return parseResponse(data.message.content);
  
  return {
    name: "Example artifact",
    period: "Unknown",
    origin: "Unknown",
    material: metadata.material || "Unknown",
    description: "Example description",
    historical_context: "Example context",
    similar_finds: "",
    confidence: 50,
    rarity: "common"
  };
}

function buildPrompt(metadata) {
  const parts = [];
  if (metadata.depth_found) parts.push(`Depth found: ${metadata.depth_found}`);
  if (metadata.soil_type) parts.push(`Soil type: ${metadata.soil_type}`);
  if (metadata.latitude && metadata.longitude) {
    parts.push(`Location: ${metadata.latitude}, ${metadata.longitude}`);
  }
  // ... add more context
  return `Analyze this artifact. Context: ${parts.join(', ')}`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
```

## Example: Using Ollama Directly

If you're using Ollama and want the worker to talk to it directly:

```toml
[vars]
BACKEND_URL = "http://localhost:11434"
BACKEND_TYPE = "ollama"
```

The worker will automatically format requests for Ollama's API with image URLs.

## Metadata Fields

The `metadata` object includes:

| Field | Type | Description |
|-------|------|-------------|
| `depth_found` | string | "surface", "shallow", "medium", "deep" |
| `soil_type` | string | "sandy", "clay", "loam", "peat" |
| `condition` | string | "excellent", "good", "fair", "poor", "fragmentary" |
| `detection_method` | string | "metal_detector", "digging", "surface_find", etc. |
| `material` | string | Known material (if user specified) |
| `latitude` | number | Find location latitude |
| `longitude` | number | Find location longitude |

## Testing

1. Start your backend server
2. Update `wrangler.toml` with your backend URL
3. Test locally: `cd workers/analyze-artifact && wrangler dev`
4. Send a test request to your worker

## Debugging

Check worker logs for:
- `Calling backend at: ...` - confirms backend URL is set
- `Image URLs: ...` - shows URLs being sent
- `Metadata: ...` - shows metadata being sent
- `Backend response length: ...` - confirms successful response

Check your backend logs for incoming requests.

