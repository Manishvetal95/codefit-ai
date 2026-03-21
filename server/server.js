const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();


app.set('trust proxy', 1);   // ⭐ MUST for Render / rate-limit / real IP

const PORT = process.env.PORT || 5000;

// Security Middleware - Relaxed CSP for Gemini and local media
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "https://*.google.com"],
      "connect-src": ["'self'", "https://*.googleapis.com"],
    },
  },
}));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Middleware
app.use(express.json());
app.use(cors());

// Log static file requests and check existence for debugging
app.use('/uploads', (req, res, next) => {
  const fs = require('fs');
  const filePath = path.join(__dirname, 'uploads', req.url);
  console.log(`Static file request: ${req.url} - Exists: ${fs.existsSync(filePath)}`);
  next();
});

const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));
console.log(`Serving static files from: ${uploadsPath}`);

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));

// Diagnostic Route
app.get('/api/health', async (req, res) => {
  const healthStatus = {
    server: 'Running',
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    geminiKey: !!process.env.GEMINI_API_KEY ? 'Present' : 'Missing',
    nodeEnv: process.env.NODE_ENV || 'development'
  };
  res.json(healthStatus);
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {

  app.use(express.static(path.join(__dirname, '../client/dist')));

  app.use((req, res) => {
    res.sendFile(path.resolve(__dirname, '../client', 'dist', 'index.html'));
  });

} // ✅ VERY IMPORTANT closing bracket



// Final Error Handler
app.use((err, req, res, next) => {
  console.error('[FINAL ERROR HANDLER]:', err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      message: err.message || 'Internal Server Error',
      error: process.env.NODE_ENV === 'production' ? null : {
        message: err.message,
        stack: err.stack
      }
    });
  }
});

 



// Global Error Handlers
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // In production, you might want to gracefully shutdown or notify an error service
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Wait a second to ensure Render flushes the error logs before the process dies
  setTimeout(() => process.exit(1), 1000);
});


mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');

    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);

      if (!process.env.GEMINI_API_KEY) {
        console.warn('WARNING: GEMINI_API_KEY is not set in environment variables!');
      }
    });

  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    // Wait a second to ensure Render flushes the error logs before the process dies
    setTimeout(() => process.exit(1), 1000);
  });