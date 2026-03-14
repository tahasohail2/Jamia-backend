// Quick test to verify Cloudinary is configured correctly
require('dotenv').config();
const { cloudinary } = require('./src/config/cloudinary');

async function testCloudinary() {
  console.log('Testing Cloudinary connection...\n');
  
  console.log('Configuration:');
  console.log('  Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
  console.log('  API Key:', process.env.CLOUDINARY_API_KEY ? '✓ Set' : '✗ Not set');
  console.log('  API Secret:', process.env.CLOUDINARY_API_SECRET ? '✓ Set' : '✗ Not set');
  
  try {
    // Test API connection by fetching account details
    const result = await cloudinary.api.ping();
    console.log('\n✓ Cloudinary connection successful!');
    console.log('  Status:', result.status);
  } catch (error) {
    console.error('\n✗ Cloudinary connection failed:');
    console.error('  Error:', error.message);
    process.exit(1);
  }
}

testCloudinary();
