# Local Backend for Archeos Testing with Ollama llava

## Setup Instructions

### 1. Install Ollama and llava model

```bash
# Install Ollama from https://ollama.com

# Pull the llava model (vision model)
ollama pull llava

# Start Ollama (if not already running)
ollama serve
```

### 2. Setup local backend

```bash
# Navigate to the local-backend folder
cd local-backend

# Install dependencies
npm install

# Start the local backend server
node server.js
```

The server will start on `http://localhost:3000`

### 3. Configure the worker

Update `workers/analyze-artifact/wrangler.toml`:

```toml
[vars]
BACKEND_URL = "http://localhost:3000"
BACKEND_TYPE = "custom"
USE_CLOUDFLARE_FALLBACK = "false"
```

### 4. Test the setup

1. Start your worker locally: `cd workers/analyze-artifact && wrangler dev`
2. Open the frontend and try to analyze an artifact
3. Check the local backend console for incoming requests
4. Check F12 console in browser to see the HTTP request being sent

## How it works

1. Frontend sends image URLs + metadata to Cloudflare Worker
2. Worker forwards request to local backend (`http://localhost:3000/api/analyze`)
3. Local backend fetches images from Supabase URLs
4. Local backend sends images + prompt to Ollama llava
5. Ollama analyzes the image and returns response
6. Local backend parses response and returns structured JSON

## API Format

### Request (Worker → Local Backend)

```json
POST http://localhost:3000/api/analyze
{
  "image_urls": ["https://supabase-url/image.jpg"],
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

### Response (Local Backend → Worker)

```json
{
  "name": "Roman bronze fibula",
  "period": "1st-3rd century AD",
  "origin": "Roman Empire",
  "material": "bronze",
  "description": "A small bronze fibula...",
  "historical_context": "Fibulae were used as clothing fasteners...",
  "similar_finds": "Similar finds in Roman Britain...",
  "confidence": 85,
  "rarity": "uncommon"
}
```

## Troubleshooting

- **Ollama not running**: Make sure `ollama serve` is running
- **llava not pulled**: Run `ollama pull llava`
- **Supabase images not accessible**: Check if the image URLs are public
- **Port 3000 in use**: Change PORT in server.js

## Testing without Supabase

You can test the backend directly:

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"image_urls":["https://example.com/image.jpg"],"metadata":{"depth_found":"shallow"}}'
```
