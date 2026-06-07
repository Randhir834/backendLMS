const { query } = require('../config/database');

const getAllSettings = async () => {
  const result = await query('SELECT * FROM system_settings ORDER BY key ASC');
  return result.rows;
};

const getSettingByKey = async (key) => {
  const result = await query('SELECT * FROM system_settings WHERE key = $1', [key]);
  return result.rows[0] || null;
};

const upsertSetting = async (key, value) => {
  const result = await query(
    `INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
     RETURNING *`,
    [key, value]
  );
  return result.rows[0];
};

module.exports = { getAllSettings, getSettingByKey, upsertSetting };
