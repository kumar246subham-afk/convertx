const mongoose = require('mongoose');
const env = require('./env');

let isConnected = false;

/**
 * Safely URL-encode username and password segments in a MongoDB URI
 * so unencoded characters (e.g. @, :, #, /) in passwords do not break parsing.
 */
function normalizeMongoUri(rawUri) {
  if (!rawUri || typeof rawUri !== 'string') return '';
  const trimmed = rawUri.trim();
  const schemeMatch = trimmed.match(/^(mongodb(?:\+srv)?:\/\/)(.*)$/i);
  if (!schemeMatch) return trimmed;

  const scheme = schemeMatch[1];
  const remainder = schemeMatch[2];
  const slashIdx = remainder.indexOf('/');
  const qIdx = remainder.indexOf('?');
  const boundaryIdx =
    slashIdx !== -1 && qIdx !== -1
      ? Math.min(slashIdx, qIdx)
      : slashIdx !== -1
        ? slashIdx
        : qIdx !== -1
          ? qIdx
          : remainder.length;

  const authority = remainder.slice(0, boundaryIdx);
  const tail = remainder.slice(boundaryIdx);
  const lastAtIdx = authority.lastIndexOf('@');
  if (lastAtIdx === -1) return trimmed;

  const userInfo = authority.slice(0, lastAtIdx);
  const hostPart = authority.slice(lastAtIdx + 1);
  const firstColonIdx = userInfo.indexOf(':');
  if (firstColonIdx === -1) return trimmed;

  const rawUser = userInfo.slice(0, firstColonIdx);
  const rawPass = userInfo.slice(firstColonIdx + 1);

  const safeEncode = (val) => {
    try {
      return encodeURIComponent(decodeURIComponent(val));
    } catch {
      return encodeURIComponent(val);
    }
  };

  return `${scheme}${safeEncode(rawUser)}:${safeEncode(rawPass)}@${hostPart}${tail}`;
}

async function connectDB() {
  if (!env.MONGO_URI || env.MONGO_URI.trim() === '') {
    console.log('[Database] MongoDB URI not provided. Running in anonymous mode (core PDF features fully available).');
    return false;
  }

  try {
    mongoose.set('strictQuery', false);
    const normalizedUri = normalizeMongoUri(env.MONGO_URI);
    const hasExplicitDbName = /^mongodb(\+srv)?:\/\/[^/]+\/[^?]+/.test(normalizedUri);
    await mongoose.connect(normalizedUri, {
      serverSelectionTimeoutMS: env.NODE_ENV === 'production' ? 10000 : 4000,
      ...(hasExplicitDbName ? {} : { dbName: 'convertx' }),
    });
    isConnected = true;
    console.log(`[Database] Successfully connected to MongoDB (db: ${mongoose.connection.name}).`);
    return true;
  } catch (error) {
    const safeMsg = (error.message || 'Unknown error').replace(
      /mongodb(\+srv)?:\/\/[^\s"']+/gi,
      'mongodb://[REDACTED]'
    );
    console.warn(`[Database] MongoDB connection failed (${error.name || 'Error'}: ${safeMsg}). Running in fallback anonymous mode.`);
    isConnected = false;
    return false;
  }
}

function getDBStatus() {
  return {
    configured: Boolean(env.MONGO_URI && env.MONGO_URI.trim() !== ''),
    connected: isConnected && mongoose.connection.readyState === 1,
    state: mongoose.connection.readyState,
  };
}

module.exports = {
  connectDB,
  getDBStatus,
  normalizeMongoUri,
};
