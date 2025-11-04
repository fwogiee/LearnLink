import 'dotenv/config';

const key = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';

async function main() {
  if (!key) {
    console.error('Missing GEMINI_API_KEY in environment.');
    process.exit(1);
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: 'Respond with a JSON object { "status": "ok" }.' }],
      },
    ],
  };

  console.log('Testing Gemini endpoint…');
  console.log('Model:', model);
  console.log('Endpoint:', endpoint);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key,
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    console.log('Status:', response.status, response.statusText);
    console.log('Raw response body:\n', text);
  } catch (error) {
    console.error('Request failed:', error);
  }
}

main();
