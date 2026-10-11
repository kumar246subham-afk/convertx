const mongoose = require('mongoose');
const env = require('./env');

let isConnected = false;

async function connectDB() {
  if (!env.MONGO_URI || env.MONGO_URI.trim() === '') {
    console.log('[Database] MongoDB URI not provided. Running in anonymous mode (core PDF features fully available).');
    return false;
  }

  try {
    mongoose.set('strictQuery', false);
    const hasExplicitDbName = /^mongodb(\+srv)?:\/\/[^/]+\/[^?]+/.test(env.MONGO_URI.trim());
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: env.NODE_ENV === 'production' ? 10000 : 4000,
      ...(hasExplicitDbName ? {} : { dbName: 'convertx' }),
    });
    isConnected = true;
    console.log(`[Database] Successfully connected to MongoDB (db: ${mongoose.connection.name}).`);
    return true;
  } catch (error) {
    console.warn(`[Database] MongoDB connection failed: ${error.message}. Running in fallback anonymous mode.`);
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
};
