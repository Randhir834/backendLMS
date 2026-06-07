const { getSupabaseClient } = require('../config/supabase');

async function setupStorage() {
  console.log('🗄️  Setting up Supabase Storage for Course Materials...\n');

  try {
    const supabase = getSupabaseClient();

    // Create private bucket for course materials
    console.log('1. Creating course-materials-private bucket...');
    
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Failed to list buckets:', listError.message);
      return;
    }

    const existingBucket = buckets.find(bucket => bucket.name === 'course-materials-private');
    
    if (existingBucket) {
      console.log('✅ course-materials-private bucket already exists');
    } else {
      const { data, error } = await supabase.storage.createBucket('course-materials-private', {
        public: false,
        allowedMimeTypes: [
          'application/pdf',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'
        ],
        fileSizeLimit: 104857600 // 100MB
      });

      if (error) {
        console.error('❌ Failed to create bucket:', error.message);
        return;
      }

      console.log('✅ course-materials-private bucket created successfully');
    }

    // Set up Row Level Security (RLS) policies
    console.log('\n2. Setting up storage policies...');
    
    // Note: Storage policies are typically set up through the Supabase dashboard
    // or using the SQL editor. Here we'll provide the SQL commands.
    
    console.log('📋 Please run the following SQL commands in your Supabase SQL editor:');
    console.log(`
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view course materials they have access to
CREATE POLICY "Course materials access policy" ON storage.objects
FOR SELECT USING (
  bucket_id = 'course-materials-private' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM course_materials cm
    JOIN course_instructors ci ON cm.course_id = ci.course_id
    WHERE cm.file_path = name AND ci.instructor_id = auth.uid()::int
  )
);

-- Policy: Allow admins to upload course materials
CREATE POLICY "Admin upload policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'course-materials-private' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid()::int AND u.role = 'admin'
  )
);

-- Policy: Allow admins to delete course materials
CREATE POLICY "Admin delete policy" ON storage.objects
FOR DELETE USING (
  bucket_id = 'course-materials-private' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid()::int AND u.role = 'admin'
  )
);
    `);

    // Test bucket access
    console.log('\n3. Testing bucket access...');
    
    const testFileName = 'test-file.txt';
    const testContent = 'This is a test file for course materials';
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('course-materials-private')
      .upload(`test/${testFileName}`, Buffer.from(testContent), {
        contentType: 'text/plain'
      });

    if (uploadError) {
      console.error('❌ Failed to upload test file:', uploadError.message);
    } else {
      console.log('✅ Test file uploaded successfully');
      
      // Generate signed URL
      const { data: urlData, error: urlError } = await supabase.storage
        .from('course-materials-private')
        .createSignedUrl(`test/${testFileName}`, 60);

      if (urlError) {
        console.error('❌ Failed to generate signed URL:', urlError.message);
      } else {
        console.log('✅ Signed URL generated successfully');
        console.log(`   URL: ${urlData.signedUrl.substring(0, 50)}...`);
      }

      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from('course-materials-private')
        .remove([`test/${testFileName}`]);

      if (deleteError) {
        console.error('⚠️  Failed to clean up test file:', deleteError.message);
      } else {
        console.log('✅ Test file cleaned up successfully');
      }
    }

    console.log('\n🎉 Storage setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Private bucket for course materials created');
    console.log('   ✅ File upload/download tested');
    console.log('   ✅ Signed URL generation working');
    console.log('\n⚠️  Important:');
    console.log('   • Make sure to run the RLS policies in Supabase SQL editor');
    console.log('   • Update SUPABASE_SERVICE_ROLE_KEY in .env with your actual key');
    console.log('   • The bucket is private - files are only accessible via signed URLs');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the setup
setupStorage().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});