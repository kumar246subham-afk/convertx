const mongoose = require('mongoose');
const env = require('./env');

let isConnected = false;
let lastErrorDiagnostic = null;
let lastConnectAttemptMs = 0;
let connectInFlight = null;

// Keep isConnected synchronized with actual Mongoose connection state
mongoose.connection.on('connected', () => {
  isConnected = true;
  lastErrorDiagnostic = null;
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
});

mongoose.connection.on('error', () => {
  if (mongoose.connection.readyState !== 1) {
    isConnected = false;
  }
});

/**
 * Redact any MongoDB URI or credential pattern from an error string
 */
function redactSecrets(text) {
  if (!text || typeof text !== 'string') return 'Unknown error';
  return text
    .replace(/mongodb(\+srv)?:\/\/[^\s"']+/gi, 'mongodb://[REDACTED]')
    .replace(/\/\/([^:/\s]+):([^@/\s]+)@/g, '//[REDACTED]:[REDACTED]@');
}

/**
 * Safely clean and URL-encode username and password segments in a MongoDB URI
 * Strips accidental 'MONGO_URI=' prefixes or surrounding quotes from dashboard copy-pastes,
 * and URL-encodes special characters (e.g. @, :, #, /) in credentials.
 */
function normalizeMongoUri(rawUri) {
  if (!rawUri || typeof rawUri !== 'string') return '';
  let trimmed = rawUri.trim();

  // Iteratively strip accidental surrounding quotes and leading MONGO_URI= prefixes
  let changed = true;
  while (changed) {
    changed = false;
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      trimmed = trimmed.slice(1, -1).trim();
      changed = true;
    }
    if (/^MONGO_URI\s*=\s*/i.test(trimmed)) {
      trimmed = trimmed.replace(/^MONGO_URI\s*=\s*/i, '').trim();
      changed = true;
    }
  }

  const schemeMatch = trimmed.match(/^(mongodb(?:\+srv)?:\/\/)(.*)$/i);
  if (!schemeMatch) return trimmed;

  const scheme = schemeMatch[1];
  const remainder = schemeMatch[2];
  const qIdx = remainder.indexOf('?');
  const beforeQuery = qIdx !== -1 ? remainder.slice(0, qIdx) : remainder;
  const queryPart = qIdx !== -1 ? remainder.slice(qIdx) : '';

  const lastAtIdx = beforeQuery.lastIndexOf('@');
  if (lastAtIdx === -1) return trimmed;

  const userInfo = beforeQuery.slice(0, lastAtIdx);
  const hostAndPath = beforeQuery.slice(lastAtIdx + 1);
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

  return `${scheme}${safeEncode(rawUser)}:${safeEncode(rawPass)}@${hostAndPath}${queryPart}`;
}

/**
 * Classify a MongoDB connection failure into a safe, secret-free diagnostic category and hint
 */
function classifyMongoError(error, rawUri = '') {
  const cleaned = (rawUri || '').trim();
  if (!cleaned) {
    return {
      category: 'MISSING_URI',
      hint: 'MONGO_URI environment variable is empty or not set.',
    };
  }

  // Check if unreplaced <password> or <db_password> placeholder exists in raw URI
  if (/<[^>@/\s]*password[^>@/\s]*>/i.test(cleaned) || /<username>/i.test(cleaned)) {
    return {
      category: 'PLACEHOLDER_CREDENTIALS',
      hint: 'MONGO_URI contains an unreplaced <password> or <username> placeholder.',
    };
  }

  const normalized = normalizeMongoUri(cleaned);
  if (!/^mongodb(\+srv)?:\/\//i.test(normalized)) {
    return {
      category: 'INVALID_URI_FORMAT',
      hint: 'MONGO_URI must start with mongodb:// or mongodb+srv://.',
    };
  }

  const msg = redactSecrets((error && error.message) || '');
  const name = (error && error.name) || 'Error';
  const code = error && error.code;

  if (
    code === 18 ||
    code === 8000 ||
    /authentication failed|bad auth|auth error/i.test(msg)
  ) {
    return {
      category: 'AUTH_FAILED',
      hint: 'MongoDB Atlas rejected the username or password. Verify Database Access credentials in Atlas and MONGO_URI in Render.',
    };
  }

  if (
    /querySrv|ENOTFOUND|EREFUSED|EAI_AGAIN/i.test(msg) ||
    code === 'ENOTFOUND' ||
    code === 'EREFUSED'
  ) {
    return {
      category: 'DNS_LOOKUP_FAILED',
      hint: 'DNS SRV lookup failed for the cluster hostname in MONGO_URI. Verify the cluster address in Atlas Connect -> Drivers.',
    };
  }

  if (
    name === 'MongoParseError' ||
    /Invalid scheme|URI malformed|Invalid connection string/i.test(msg)
  ) {
    return {
      category: 'INVALID_URI_FORMAT',
      hint: 'MONGO_URI syntax is invalid. Check for extra prefixes, spaces, or unencoded characters.',
    };
  }

  if (
    name === 'MongooseServerSelectionError' ||
    name === 'MongoServerSelectionError' ||
    /Could not connect to any servers|IP that isn't whitelisted|Server selection timed out|ReplicaSetNoPrimary/i.test(
      msg
    )
  ) {
    return {
      category: 'NETWORK_OR_IP_ALLOWLIST',
      hint: 'Could not reach MongoDB Atlas cluster. Ensure Atlas Network Access allows Render outbound IPs (or 0.0.0.0/0) and the cluster is active.',
    };
  }

  if (name === 'MongoNetworkTimeoutError' || /timed out|ETIMEDOUT/i.test(msg)) {
    return {
      category: 'CONNECTION_TIMEOUT',
      hint: 'Connection to MongoDB timed out before handshake completed.',
    };
  }

  return {
    category: 'CONNECTION_ERROR',
    hint: `${name}: ${msg}`,
  };
}

async function connectDB() {
  const currentUri = env.MONGO_URI || process.env.MONGO_URI || '';
  if (!currentUri || currentUri.trim() === '') {
    lastErrorDiagnostic = null;
    isConnected = false;
    console.log(
      '[Database] MongoDB URI not provided. Running in anonymous mode (core PDF features fully available).'
    );
    return false;
  }

  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    lastErrorDiagnostic = null;
    return true;
  }

  if (connectInFlight) {
    return connectInFlight;
  }

  lastConnectAttemptMs = Date.now();

  connectInFlight = (async () => {
    try {
      mongoose.set('strictQuery', false);
      const normalizedUri = normalizeMongoUri(currentUri);

      if (/<[^>@/\s]*password[^>@/\s]*>/i.test(currentUri)) {
        throw new Error('MONGO_URI contains unreplaced <password> placeholder');
      }

      const hasExplicitDbName = /^mongodb(\+srv)?:\/\/[^/]+\/[^?]+/.test(normalizedUri);
      await mongoose.connect(normalizedUri, {
        serverSelectionTimeoutMS: env.NODE_ENV === 'production' ? 10000 : 4000,
        ...(hasExplicitDbName ? {} : { dbName: 'convertx' }),
      });
      isConnected = mongoose.connection.readyState === 1;
      lastErrorDiagnostic = null;
      console.log(
        `[Database] Successfully connected to MongoDB (db: ${mongoose.connection.name}).`
      );
      return true;
    } catch (error) {
      const diag = classifyMongoError(error, currentUri);
      lastErrorDiagnostic = diag;
      const safeMsg = redactSecrets(error.message || 'Unknown error');
      console.warn(
        `[Database] MongoDB connection failed [${diag.category}]: ${diag.hint} (Details: ${error.name || 'Error'}: ${safeMsg}). Running in fallback anonymous mode.`
      );
      isConnected = false;
      return false;
    } finally {
      connectInFlight = null;
    }
  })();

  return connectInFlight;
}

/**
 * Throttled reconnect helper so health checks or auth requests automatically recover
 * once Atlas Network Access or MONGO_URI is fixed, without hammering the database.
 */
async function ensureDBConnected(minIntervalMs = 15000) {
  const currentUri = env.MONGO_URI || process.env.MONGO_URI || '';
  if (!currentUri || currentUri.trim() === '') return false;
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return true;
  }
  if (Date.now() - lastConnectAttemptMs < minIntervalMs) {
    return false;
  }
  return connectDB();
}

function getDBStatus() {
  const currentUri = env.MONGO_URI || process.env.MONGO_URI || '';
  const configured = Boolean(currentUri && currentUri.trim() !== '');
  const connected = isConnected && mongoose.connection.readyState === 1;

  const status = {
    configured,
    connected,
    state: mongoose.connection.readyState,
  };

  if (connected && mongoose.connection.name) {
    status.dbName = mongoose.connection.name;
  } else if (configured && !connected && lastErrorDiagnostic) {
    status.errorCategory = lastErrorDiagnostic.category;
    status.errorHint = lastErrorDiagnostic.hint;
  }

  return status;
}

module.exports = {
  connectDB,
  ensureDBConnected,
  getDBStatus,
  normalizeMongoUri,
  classifyMongoError,
};
