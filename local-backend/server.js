// Local backend server for testing with Ollama llava
// Run: node server.js
// Requires: npm install express cors node-fetch

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const OLLAMA_URL = 'http://localhost:11434';
const PORT = 3000;

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', backend: 'local-test', ollama: OLLAMA_URL });
});

// Main analyze endpoint - receives image URLs + metadata from worker
app.post('/api/analyze', async (req, res) => {
  try {
    const { image_urls, metadata } = req.body;
    
    console.log('\n=== NEW REQUEST ===');
    console.log('Image URLs:', image_urls);
    console.log('Metadata:', JSON.stringify(metadata, null, 2));
    
    if (!image_urls || image_urls.length === 0) {
      return res.status(400).json({ error: 'No image URLs provided' });
    }
    
    // Fetch images from URLs (Supabase)
    console.log('Fetching images from URLs...');
    const images = await Promise.all(
      image_urls.map(async (url, idx) => {
        console.log(`Fetching image ${idx + 1}: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch image ${idx + 1}: ${response.status}`);
        }
        const buffer = await response.buffer();
        return buffer.toString('base64');
      })
    );
    
    console.log(`Fetched ${images.length} image(s)`);
    
    // Build prompt from metadata
    const contextParts = [];
    if (metadata?.depth_found) contextParts.push(`Depth found: ${metadata.depth_found}`);
    if (metadata?.soil_type) contextParts.push(`Soil type: ${metadata.soil_type}`);
    if (metadata?.condition) contextParts.push(`Condition: ${metadata.condition}`);
    if (metadata?.detection_method) contextParts.push(`Detection method: ${metadata.detection_method}`);
    if (metadata?.material) contextParts.push(`Material: ${metadata.material}`);
    if (metadata?.latitude && metadata?.longitude) {
      contextParts.push(`Location: Lat ${metadata.latitude}, Lng ${metadata.longitude}`);
    }
    
    const contextText = contextParts.length > 0 ? contextParts.join(', ') : 'No context provided';
    
    const prompt = `You are an expert archaeologist analyzing archaeological finds.

Context: ${contextText}

Analyze this artifact and provide detailed identification using these fields:
**Name:** [Specific identification]
**Period:** [Time period]
**Origin:** [Region of origin]
**Material:** [What it's made of]
**Description:** [2-3 sentences]
**Historical Context:** [Historical significance]
**Similar Finds:** [Similar known artifacts]
**Confidence:** [0-99]
**Rarity:** [common/uncommon/rare]

Provide your response using these exact field names.`;
    
    console.log('Sending request to Ollama with llava...');
    console.log('Prompt:', prompt.substring(0, 200) + '...');
    
    // Call Ollama with llava model
    const ollamaResponse = await fetch(`${OLLAMA_URL}/api/chat`, {
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
    
    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      console.error('Ollama error:', errorText);
      return res.status(500).json({ error: 'Ollama request failed', details: errorText });
    }
    
    const ollamaData = await ollamaResponse.json();
    console.log('Ollama response received');
    
    const aiResponse = ollamaData.message?.content || ollamaData.response || '';
    
    // Parse the response to extract fields
    const result = parseResponse(aiResponse);
    console.log('Parsed result:', JSON.stringify(result, null, 2));
    
    res.json(result);
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

function parseResponse(text) {
  const result = {};
  
  const extractField = (field) => {
    const patterns = [
      new RegExp(`\\*\\*${field}:\\*\\*\\s*(.+?)(?:\\n|$)`, 'i'),
      new RegExp(`${field}:\\s*(.+?)(?:\\n|$)`, 'i')
    ];
    for (const regex of patterns) {
      const match = text.match(regex);
      if (match && match[1]) {
        return match[1].replace(/^\*+\s*/g, '').replace(/\*+$/g, '').trim();
      }
    }
    return '';
  };
  
  result.name = extractField('Name');
  result.period = extractField('Period');
  result.origin = extractField('Origin');
  result.material = extractField('Material');
  result.description = extractField('Description');
  result.historical_context = extractField('Historical Context');
  result.similar_finds = extractField('Similar Finds');
  
  const confidenceStr = extractField('Confidence');
  result.confidence = parseInt(confidenceStr.replace(/\D/g, '')) || 50;
  
  result.rarity = extractField('Rarity');
  
  return result;
}

app.listen(PORT, () => {
  console.log(`\n=== Local Backend Server ===`);
  console.log(`Listening on http://localhost:${PORT}`);
  console.log(`Ollama URL: ${OLLAMA_URL}`);
  console.log(`Model: llava`);
  console.log(`\nMake sure Ollama is running: ollama serve`);
  console.log(`Make sure llava is pulled: ollama pull llava\n`);
});
