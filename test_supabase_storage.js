#!/usr/bin/env node
/**
 * Test script to verify Supabase Storage configuration
 * Run: node test_supabase_storage.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSupabaseStorage() {
  console.log('🔍 Testing Supabase Storage Configuration...\n');

  // Check environment variables
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  const bucket = process.env.SUPABASE_BUCKET || 'playfit-storage';

  console.log('Environment Variables:');
  console.log(`  SUPABASE_URL: ${url ? '✅ Set' : '❌ Missing'}`);
  console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${serviceKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`  SUPABASE_BUCKET: ${bucket}`);
  console.log();

  if (!url || !serviceKey) {
    console.error('❌ ERROR: Missing required environment variables');
    console.log('\nPlease set in your .env file:');
    console.log('  SUPABASE_URL=https://your-project.supabase.co');
    console.log('  SUPABASE_SERVICE_ROLE_KEY=eyJ...');
    process.exit(1);
  }

  // Check if service key looks valid
  if (serviceKey.startsWith('sb_publishable_') || serviceKey.startsWith('sb_public_')) {
    console.warn('⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY looks like a publishable key!');
    console.warn('   The service role key should start with "eyJ..." not "sb_publishable_"');
    console.warn('   Get it from: Supabase Dashboard > Project Settings > API > service_role\n');
  }

  try {
    // Create Supabase client
    const supabase = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    console.log('📦 Testing bucket access...');
    
    // List buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Failed to list buckets:', bucketsError.message);
      return;
    }

    console.log(`✅ Connected to Supabase Storage`);
    console.log(`   Found ${buckets.length} bucket(s):`);
    buckets.forEach(b => {
      const isTarget = b.name === bucket;
      const status = isTarget ? '👉' : '  ';
      const publicStatus = b.public ? '(public)' : '(private)';
      console.log(`   ${status} ${b.name} ${publicStatus}`);
    });
    console.log();

    // Check if target bucket exists
    const targetBucket = buckets.find(b => b.name === bucket);
    
    if (!targetBucket) {
      console.error(`❌ Bucket "${bucket}" does not exist!`);
      console.log('\n📝 To create it:');
      console.log('   1. Go to: https://app.supabase.com/project/zeitdsmatfzvxtufpcst/storage/buckets');
      console.log('   2. Click "New bucket"');
      console.log(`   3. Name: ${bucket}`);
      console.log('   4. Enable "Public bucket"');
      console.log('   5. Click "Create bucket"');
      return;
    }

    console.log(`✅ Target bucket "${bucket}" exists`);
    
    if (!targetBucket.public) {
      console.warn(`⚠️  WARNING: Bucket "${bucket}" is PRIVATE`);
      console.warn('   Images won\'t be publicly accessible!');
      console.warn('   Make it public in Supabase Dashboard\n');
    } else {
      console.log(`✅ Bucket "${bucket}" is public`);
    }

    // Test upload (create a tiny test file)
    console.log('\n📤 Testing file upload...');
    const testFileName = `test/${Date.now()}-test.txt`;
    const testContent = 'This is a test file from Playfit LMS';
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(testFileName, Buffer.from(testContent), {
        contentType: 'text/plain',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError.message);
      if (uploadError.message.includes('row-level security')) {
        console.log('\n💡 This usually means bucket policies are not configured');
        console.log('   Go to Storage > playfit-storage > Policies');
        console.log('   Add a policy for INSERT access');
      }
      return;
    }

    console.log('✅ Upload successful:', testFileName);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(testFileName);

    console.log('✅ Public URL:', urlData.publicUrl);

    // Test delete
    console.log('\n🗑️  Testing file deletion...');
    const { error: deleteError } = await supabase.storage
      .from(bucket)
      .remove([testFileName]);

    if (deleteError) {
      console.error('❌ Delete failed:', deleteError.message);
    } else {
      console.log('✅ Delete successful');
    }

    console.log('\n✅ All tests passed! Supabase Storage is configured correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testSupabaseStorage();
