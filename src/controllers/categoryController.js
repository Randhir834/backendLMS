const {
  findAllCategories, findCategoryById, createCategory, updateCategoryById, deleteCategoryById,
} = require('../services/categoryService');

const getCategories = async (req, res, next) => {
  try {
    const categories = await findAllCategories();
    res.json({ categories });
  } catch (error) { next(error); }
};

const getCategoryById = async (req, res, next) => {
  try {
    const category = await findCategoryById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json({ category });
  } catch (error) { next(error); }
};

const createCategoryController = async (req, res, next) => {
  try {
    const category = await createCategory(req.body);
    res.status(201).json({ message: 'Category created successfully', category });
  } catch (error) { next(error); }
};

const updateCategory = async (req, res, next) => {
  try {
    const category = await updateCategoryById(req.params.id, req.body);
    res.json({ message: 'Category updated successfully', category });
  } catch (error) { next(error); }
};

const deleteCategory = async (req, res, next) => {
  try {
    await deleteCategoryById(req.params.id);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) { next(error); }
};

module.exports = { getCategories, getCategoryById, createCategoryController, updateCategory, deleteCategory };
