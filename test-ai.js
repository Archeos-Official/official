// Test script to debug the AI worker
const ACCOUNT_ID = 'a0aea21f8b422b03ea28d79829060046';
const API_TOKEN = 'cfut_WS2J372BIQpzpCiyTG3gChdyVWnSZ1mozJXp1lz6a754da42';

// Simple 1x1 red pixel JPEG in base64
const tinyImage = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcHBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIhwcHCfoKIinANERENDh4nICorKS8wNw==';

async function testAI() {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stream: false,
        prompt: 'What do you see in this image? Describe the object.',
        max_tokens: 500,
        image: `data:image/jpeg;base64,${tinyImage}`,
      }),
    }
  );

  const data = await response.json();
  console.log('Response status:', response.status);
  console.log('Response keys:', Object.keys(data));
  console.log('Result:', data.result?.response || data.error || data);
}

testAI().catch(console.error);