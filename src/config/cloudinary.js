const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Test connection
const testCloudinaryConnection = () => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.warn('[Cloudinary] Warning: Cloudinary credentials not configured');
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Cloudinary configuration failed`);
    return false;
  }
};

module.exports = {
  cloudinary,
  testCloudinaryConnection
};
