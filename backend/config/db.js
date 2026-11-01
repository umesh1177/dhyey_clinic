const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/jaydipclinic';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    isConnected = true;
    console.log(`[MongoDB Connected]: Host=${conn.connection.host}:${conn.connection.port}, Database=${conn.connection.name}`);
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    console.warn('[MongoDB Notice]: Ensure MongoDB daemon (mongod) is running at ' + uri);
  }
};

module.exports = connectDB;
