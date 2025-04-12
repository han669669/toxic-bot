// netlify/functions/chat-proxy.js
const axios = require('axios');
require('dotenv').config(); // For local testing with .env file

const API_KEY = process.env.CEREBRAS_API_KEY;
const BASE_URL = 'https://api.cerebras.ai/v1';

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    if (!API_KEY) {
        console.error('CEREBRAS_API_KEY environment variable not set.');
        return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error: API key missing.' }) };
    }

    try {
        // Parse the incoming request body
        const body = JSON.parse(event.body);
        const { messages, toxicityLevel } = body;

        // Basic validation (can be enhanced)
        if (!messages || !Array.isArray(messages)) {
             return { statusCode: 400, body: JSON.stringify({ error: 'Invalid messages format' }) };
        }
        if (typeof toxicityLevel !== 'number' || toxicityLevel < 1 || toxicityLevel > 5) {
             return { statusCode: 400, body: JSON.stringify({ error: 'Toxicity level must be between 1-5' }) };
        }

        console.log('Forwarding to Cerebras API from Netlify Function:', {
            model: 'llama-4-scout-17b-16e-instruct',
            messages,
            toxicityLevel
        });

        // Make the request to the Cerebras API
        const response = await axios.post(`${BASE_URL}/chat/completions`, {
            model: 'llama-4-scout-17b-16e-instruct',
            messages,
            temperature: 0.7 + (toxicityLevel * 0.1),
            max_tokens: 150
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            }
        });

        console.log('Received response in Netlify Function:', response.data);

        // Return the response from Cerebras API
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                // Add CORS headers if needed, though often not required if calling from the same domain
                // 'Access-Control-Allow-Origin': '*', // Or specific origin
            },
            body: JSON.stringify(response.data)
        };

    } catch (error) {
        console.error('Netlify Function Proxy error:', error.response ? error.response.data : error.message);
        // Determine status code based on error type
        const statusCode = error.response ? error.response.status : 500;
        const errorMessage = error.response && error.response.data && error.response.data.error ?
                             error.response.data.error :
                             'AI request failed in Netlify Function';

        return {
            statusCode: statusCode,
            body: JSON.stringify({ error: errorMessage })
        };
    }
};
