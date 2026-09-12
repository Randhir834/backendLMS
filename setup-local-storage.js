#!/usr/bin/env node

/**
 * Setup Script for Local Storage
 * This creates the necessary directories for local file storage
 */

const fs = require('fs');
const path = require('path');

const directories = [
  'uploads',
  'uploads/general',
  'uploads/course-materials',
  'uploads/avatars',
  'uploads/profile-pictures'
];

console.log('🚀 Setting up local storage directories...\n');

directories.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Created: ${dir}`);
  } else {
    console.log(`✓ Already exists: ${dir}`);
  }
});

console.log('\n✨ Local storage setup complete!');
console.log('\n📝 Configuration:');
console.log('   - Storage mode: LOCAL');
console.log('   - Upload directory: ./uploads/');
console.log('   - Files will be served at: http://localhost:5001/uploads/');
console.log('\n💡 Tip: Restart your backend server for changes to take effect');
