const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const pdfRoutes = require('./routes/pdfRoutes');
const convertRoutes = require('./routes/convertRoutes');
const fileRoutes = require('./routes/fileRoutes');
const systemRoutes = require('./routes/systemRoutes');
const authRoutes = require('./routes/authRoutes');
const { optionalAuth } = require('./middleware/auth');
const { getDBStatus } = require('./config/db');
const JobHistory = require('./models/JobHistory');

const app = express();

// Trust first proxy (required for express-rate-limit behind Render / cloud reverse proxies)
app.set('trust proxy', 1);

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
const normalizeOrigin = (url) => (url ? url.trim().replace(/\/+$/, '') : '');

const allowedOrigins = [
  ...(env.CLIENT_ORIGIN ? env.CLIENT_ORIGIN.split(',').map(normalizeOrigin).filter(Boolean) : []),
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const localhostOriginRegex = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like curl, server-to-server, or same-origin)
    if (!origin) {
      return callback(null, true);
    }
    const cleanOrigin = normalizeOrigin(origin);
    if (allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }
    // In development mode, allow any localhost / 127.0.0.1 port (e.g. Vite on 5174, 5175, etc.)
    if (env.NODE_ENV !== 'production' && localhostOriginRegex.test(cleanOrigin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiter to /api
app.use('/api', apiLimiter);

// Record conversion history for authenticated users when MongoDB is connected
function trackJobHistory(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function (payload) {
    if (
      req.user?.id &&
      getDBStatus().connected &&
      res.statusCode === 200 &&
      payload?.success &&
      payload?.data?.downloadId
    ) {
      const toolName = req.originalUrl.replace(/^\/api\/v1\//, '').split('?')[0];
      const origName =
        req.file?.originalname ||
        (Array.isArray(req.files) && req.files.map((f) => f.originalname).join(', ')) ||
        payload.data.filename ||
        'document';
      const origSize =
        req.file?.size ||
        (Array.isArray(req.files) ? req.files.reduce((s, f) => s + (f.size || 0), 0) : undefined);

      JobHistory.create({
        userId: req.user.id,
        tool: toolName,
        originalFilename: origName,
        fileSize: origSize,
        processedSize: payload.data.size,
        status: 'completed',
      }).catch(() => {});
    }
    return originalJson(payload);
  };
  next();
}

// API v1 Routes
app.use('/api/v1', systemRoutes);
app.use('/api/v1/pdf', optionalAuth, trackJobHistory, pdfRoutes);
app.use('/api/v1/convert', optionalAuth, trackJobHistory, convertRoutes);
app.use('/api/v1/files', fileRoutes);
app.use('/api/v1/auth', authRoutes);

// Root health ping
app.get('/', (req, res) => {
  res.json({
    name: 'ConvertX API',
    version: '1.0.0',
    status: 'running',
    docs: '/api/v1/tools',
  });
});

// 404 & Centralized Error Handler
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
