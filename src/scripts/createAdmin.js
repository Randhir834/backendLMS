require('dotenv').config();

const bcrypt = require('bcryptjs');
const { pool, query } = require('../config/database');
const { findUserByEmail, createUser, updateUserPassword } = require('../services/userService');

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Admin';

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required.');
  }

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters.');
  }

  const existingUser = await findUserByEmail(email);
  const hashedPassword = await bcrypt.hash(password, 12);

  if (existingUser) {
    await updateUserPassword(existingUser.id, hashedPassword);
    await query('UPDATE users SET role = $1, name = COALESCE($2, name), updated_at = NOW() WHERE id = $3', [
      'admin',
      name,
      existingUser.id,
    ]);

    console.log(`[create-admin] Updated existing user to admin: ${email}`);
    return;
  }

  await createUser({
    name,
    email,
    password: hashedPassword,
    role: 'admin',
    date_of_birth: null,
    school: null,
    grade: null,
    parent_guardian_name: null,
    phone: null,
    location: null,
    qualifications: null,
    specialization: null,
  });

  console.log(`[create-admin] Created admin user: ${email}`);
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error('[create-admin] Failed:', err.message);
    try {
      await pool.end();
    } catch (_) {
      // ignore
    }
    process.exitCode = 1;
  });
