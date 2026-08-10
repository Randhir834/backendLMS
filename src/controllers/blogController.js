const blogService = require('../services/blogService');

class BlogController {
  // Admin: Get all blogs with filters
  async getAllBlogs(req, res) {
    try {
      const { status, search, page, limit } = req.query;
      
      const filters = {
        status,
        search,
        page: page || 1,
        limit: limit || 10
      };

      const result = await blogService.getAllBlogs(filters);
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error fetching all blogs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch blogs'
      });
    }
  }

  // Public: Get published blogs
  async getPublishedBlogs(req, res) {
    try {
      const { search, page, limit } = req.query;
      
      const filters = {
        search,
        page: page || 1,
        limit: limit || 10
      };

      const result = await blogService.getPublishedBlogs(filters);
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error fetching published blogs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch published blogs'
      });
    }
  }

  // Admin: Get blog by ID
  async getBlogById(req, res) {
    try {
      const { id } = req.params;
      
      const blog = await blogService.getBlogById(id);
      
      if (!blog) {
        return res.status(404).json({
          success: false,
          error: 'Blog not found'
        });
      }

      res.json({
        success: true,
        blog
      });
    } catch (error) {
      console.error('Error fetching blog by ID:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch blog'
      });
    }
  }

  // Public: Get blog by slug
  async getBlogBySlug(req, res) {
    try {
      const { slug } = req.params;
      
      const blog = await blogService.getBlogBySlug(slug);
      
      if (!blog) {
        return res.status(404).json({
          success: false,
          error: 'Blog not found'
        });
      }

      res.json({
        success: true,
        blog
      });
    } catch (error) {
      console.error('Error fetching blog by slug:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch blog'
      });
    }
  }

  // Admin: Create blog
  async createBlog(req, res) {
    try {
      const userId = req.user.id;
      const blogData = req.body;

      // Validate required fields
      if (!blogData.title || !blogData.content || !blogData.author) {
        return res.status(400).json({
          success: false,
          error: 'Title, content, and author are required'
        });
      }

      const blog = await blogService.createBlog(blogData, userId);
      
      res.status(201).json({
        success: true,
        message: 'Blog created successfully',
        blog
      });
    } catch (error) {
      console.error('Error creating blog:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create blog'
      });
    }
  }

  // Admin: Update blog
  async updateBlog(req, res) {
    try {
      const { id } = req.params;
      const blogData = req.body;

      const existingBlog = await blogService.getBlogById(id);
      if (!existingBlog) {
        return res.status(404).json({
          success: false,
          error: 'Blog not found'
        });
      }

      const blog = await blogService.updateBlog(id, blogData);
      
      res.json({
        success: true,
        message: 'Blog updated successfully',
        blog
      });
    } catch (error) {
      console.error('Error updating blog:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update blog'
      });
    }
  }

  // Admin: Delete blog
  async deleteBlog(req, res) {
    try {
      const { id } = req.params;

      const blog = await blogService.getBlogById(id);
      if (!blog) {
        return res.status(404).json({
          success: false,
          error: 'Blog not found'
        });
      }

      await blogService.deleteBlog(id);
      
      res.json({
        success: true,
        message: 'Blog deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting blog:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete blog'
      });
    }
  }

  // Admin: Toggle publish status
  async togglePublishStatus(req, res) {
    try {
      const { id } = req.params;

      const existingBlog = await blogService.getBlogById(id);
      if (!existingBlog) {
        return res.status(404).json({
          success: false,
          error: 'Blog not found'
        });
      }

      const blog = await blogService.togglePublishStatus(id);
      
      res.json({
        success: true,
        message: `Blog ${blog.status === 'published' ? 'published' : 'unpublished'} successfully`,
        blog
      });
    } catch (error) {
      console.error('Error toggling publish status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle publish status'
      });
    }
  }

  // Public: Get recent blogs
  async getRecentBlogs(req, res) {
    try {
      const { limit } = req.query;
      const blogs = await blogService.getRecentBlogs(limit || 3);
      
      res.json({
        success: true,
        blogs
      });
    } catch (error) {
      console.error('Error fetching recent blogs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recent blogs'
      });
    }
  }
}

module.exports = new BlogController();
