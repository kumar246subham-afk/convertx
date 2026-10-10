const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  MONGO_URI: process.env.MONGO_URI || '',
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 25,
  FILE_RETENTION_MINUTES: parseInt(process.env.FILE_RETENTION_MINUTES, 10) || 30,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'convertx_default_secret_key_never_use_in_prod',
  UPLOADS_DIR: path.resolve(__dirname, '../../uploads'),
  PROCESSED_DIR: path.resolve(__dirname, '../../processed'),
};

module.exports = env;
