const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const generateCertificateNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `CERT-${timestamp}-${random}`;
};

const createCertificate = async ({ user_id, course_id, enrollment_id, course_title, student_name }) => {
  try {
    const certificate_number = generateCertificateNumber();
    const issued_date = new Date();
    const valid_until = new Date(issued_date.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year validity

    const result = await query(
      `INSERT INTO certificates (user_id, course_id, enrollment_id, certificate_number, issued_date, valid_from, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user_id, course_id, enrollment_id, certificate_number, issued_date, issued_date, valid_until]
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      // Certificate already exists for this user-course combination
      const existing = await query(
        'SELECT * FROM certificates WHERE user_id = $1 AND course_id = $2',
        [user_id, course_id]
      );
      return existing.rows[0];
    }
    throw error;
  }
};

const getCertificatesByUser = async (user_id) => {
  const result = await query(
    `SELECT 
      c.id,
      c.certificate_number,
      c.issued_date,
      c.valid_from,
      c.valid_until,
      c.is_downloaded,
      c.downloaded_at,
      co.title AS course_title,
      co.thumbnail_url,
      u.name AS student_name,
      u.email AS student_email,
      ins.name AS instructor_name
    FROM certificates c
    JOIN courses co ON c.course_id = co.id
    JOIN users u ON c.user_id = u.id
    LEFT JOIN course_instructors ci ON co.id = ci.course_id AND ci.is_primary = true
    LEFT JOIN users ins ON ci.instructor_id = ins.id
    WHERE c.user_id = $1
    ORDER BY c.issued_date DESC`,
    [user_id]
  );
  return result.rows;
};

const getCertificateById = async (id) => {
  const result = await query(
    `SELECT 
      c.*,
      co.title AS course_title,
      u.name AS student_name,
      ins.name AS instructor_name
    FROM certificates c
    JOIN courses co ON c.course_id = co.id
    JOIN users u ON c.user_id = u.id
    LEFT JOIN course_instructors ci ON co.id = ci.course_id AND ci.is_primary = true
    LEFT JOIN users ins ON ci.instructor_id = ins.id
    WHERE c.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const getCertificateByCourseAndUser = async (user_id, course_id) => {
  const result = await query(
    'SELECT * FROM certificates WHERE user_id = $1 AND course_id = $2',
    [user_id, course_id]
  );
  return result.rows[0] || null;
};

const markCertificateDownloaded = async (id) => {
  const result = await query(
    'UPDATE certificates SET is_downloaded = true, downloaded_at = NOW() WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0];
};

const verifyCertificate = async (certificate_number) => {
  const result = await query(
    `SELECT 
      c.*,
      co.title AS course_title,
      u.name AS student_name,
      ins.name AS instructor_name
    FROM certificates c
    JOIN courses co ON c.course_id = co.id
    JOIN users u ON c.user_id = u.id
    LEFT JOIN course_instructors ci ON co.id = ci.course_id AND ci.is_primary = true
    LEFT JOIN users ins ON ci.instructor_id = ins.id
    WHERE c.certificate_number = $1`,
    [certificate_number]
  );
  return result.rows[0] || null;
};

const getCertificateStats = async () => {
  const result = await query(
    `SELECT 
      COUNT(*) AS total_certificates_issued,
      COUNT(DISTINCT user_id) AS students_with_certificates,
      COUNT(DISTINCT course_id) AS courses_with_certificates,
      COUNT(*) FILTER (WHERE is_downloaded = true) AS certificates_downloaded
    FROM certificates`
  );
  return result.rows[0];
};

module.exports = {
  createCertificate,
  getCertificatesByUser,
  getCertificateById,
  getCertificateByCourseAndUser,
  markCertificateDownloaded,
  verifyCertificate,
  getCertificateStats,
};
