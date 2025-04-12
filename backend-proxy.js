const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet'); // Add helmet middleware
require('dotenv').config();

const PRODUCTION_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;

const app = express();

// Limit request size
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${req.ip}`);
    next();
});

// Rate limiting (30 requests per minute)
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    message: {
        error: 'Too many requests - please try again in a minute'
    },
    skip: (req) => {
        // Skip rate limiting for certain conditions if needed
        return false;
    }
});

// Enhanced security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  frameguard: { action: 'deny' }
}));

// Enable CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    `https://${process.env.VERCEL_URL}`
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const API_KEY = process.env.CEREBRAS_API_KEY || 'your-api-key';
const BASE_URL = PRODUCTION_URL || 'https://api.cerebras.ai/v1';

// Request validation middleware
const validateRequest = (req, res, next) => {
    const { messages, toxicityLevel } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid messages format' });
    }
    
    if (typeof toxicityLevel !== 'number' || toxicityLevel < 1 || toxicityLevel > 5) {
        return res.status(400).json({ error: 'Toxicity level must be between 1-5' });
    }
    
    next();
};

// Auth failure rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 failed attempts
  message: 'Too many failed attempts, please try again later',
  skipSuccessfulRequests: true
});

app.use('/api', authLimiter);

// Apply rate limiting and validation to API endpoint
app.post('/api/chat', [validateRequest, limiter], async (req, res) => {
  try {
    const response = await axios.post(
      BASE_URL + '/chat/completions',
      {
        model: 'llama3.1-8b',
        messages: req.body.messages,
        max_tokens: 150
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
