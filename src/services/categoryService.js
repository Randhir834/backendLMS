const { query } = require('../config/database');

const findAllCategories = async () => {
  const result = await query('SELECT * FROM categories ORDER BY name ASC');
  return result.rows;
};

const findCategoryById = async (id) => {
  const result = await query('SELECT * FROM categories WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const createCategory = async ({ name, description }) => {
  const result = await query(
    'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
    [name, description]
  );
  return result.rows[0];
};

const updateCategoryById = async (id, { name, description }) => {
  const result = await query(
    'UPDATE categories SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = NOW() WHERE id = $3 RETURNING *',
    [name, description, id]
  );
  return result.rows[0];
};

const deleteCategoryById = async (id) => {
  await query('DELETE FROM categories WHERE id = $1', [id]);
};

module.exports = { findAllCategories, findCategoryById, createCategory, updateCategoryById, deleteCategoryById };
