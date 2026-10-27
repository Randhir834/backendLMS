require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function findStudent() {
  try {
    const email = 'mmegha.2615@gmail.com';
    
    // Query for the student
    const result = await pool.query(
      `SELECT 
        u.id,
        u.email,
        u.name,
        u.role,
        u.phone,
        u.created_at,
        u.updated_at,
        u.avatar_url,
        u.date_of_birth,
        u.school,
        u.grade,
        u.parent_guardian_name,
        u.location,
        u.qualifications,
        u.specialization
      FROM users u
      WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      console.log('No student found with this email address.');
    } else {
      const student = result.rows[0];
      console.log('\n===== STUDENT DETAILS =====');
      console.log('ID:', student.id);
      console.log('Name:', student.name);
      console.log('Email:', student.email);
      console.log('Role:', student.role);
      console.log('Phone:', student.phone || 'Not provided');
      console.log('Date of Birth:', student.date_of_birth || 'Not provided');
      console.log('School:', student.school || 'Not provided');
      console.log('Grade:', student.grade || 'Not provided');
      console.log('Parent/Guardian:', student.parent_guardian_name || 'Not provided');
      console.log('Location:', student.location || 'Not provided');
      console.log('Created At:', student.created_at);
      console.log('Updated At:', student.updated_at);
      console.log('Avatar URL:', student.avatar_url || 'No avatar');
      
      // Get enrollment information
      const enrollments = await pool.query(
        `SELECT 
          e.id as enrollment_id,
          e.enrolled_at,
          e.status,
          e.progress,
          e.completed_at,
          c.id as course_id,
          c.title as course_title,
          c.price
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.user_id = $1
        ORDER BY e.enrolled_at DESC`,
        [student.id]
      );
      
      if (enrollments.rows.length > 0) {
        console.log('\n===== ENROLLMENTS =====');
        enrollments.rows.forEach((enrollment, index) => {
          console.log(`\n${index + 1}. Course: ${enrollment.course_title}`);
          console.log(`   Course ID: ${enrollment.course_id}`);
          console.log(`   Enrollment ID: ${enrollment.enrollment_id}`);
          console.log(`   Enrolled At: ${enrollment.enrolled_at}`);
          console.log(`   Status: ${enrollment.status}`);
          console.log(`   Progress: ${enrollment.progress}%`);
          console.log(`   Completed At: ${enrollment.completed_at || 'Not completed'}`);
          console.log(`   Course Price: ₹${enrollment.price}`);
        });
      } else {
        console.log('\n===== ENROLLMENTS =====');
        console.log('No enrollments found for this student.');
      }
      
      // Get payment information
      const payments = await pool.query(
        `SELECT 
          p.id as payment_id,
          p.amount,
          p.status,
          p.payment_method,
          p.razorpay_payment_id,
          p.created_at,
          c.title as course_title
        FROM payments p
        LEFT JOIN courses c ON p.course_id = c.id
        WHERE p.user_id = $1
        ORDER BY p.created_at DESC`,
        [student.id]
      );
      
      if (payments.rows.length > 0) {
        console.log('\n===== PAYMENTS =====');
        payments.rows.forEach((payment, index) => {
          console.log(`\n${index + 1}. Payment ID: ${payment.payment_id}`);
          console.log(`   Course: ${payment.course_title || 'N/A'}`);
          console.log(`   Amount: ₹${payment.amount}`);
          console.log(`   Status: ${payment.status}`);
          console.log(`   Method: ${payment.payment_method || 'N/A'}`);
          console.log(`   Razorpay ID: ${payment.razorpay_payment_id || 'N/A'}`);
          console.log(`   Date: ${payment.created_at}`);
        });
      } else {
        console.log('\n===== PAYMENTS =====');
        console.log('No payments found for this student.');
      }
    }
    
  } catch (error) {
    console.error('Error finding student:', error.message);
  } finally {
    await pool.end();
  }
}

findStudent();
