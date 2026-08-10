const pool = require('../config/database');

class BlogService {
  // Helper function to generate slug from title
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim();
  }

  // Helper function to ensure unique slug
  async ensureUniqueSlug(slug, excludeId = null) {
    let uniqueSlug = slug;
    let counter = 1;

    while (true) {
      const query = excludeId
        ? 'SELECT id FROM blogs WHERE slug = $1 AND id != $2'
        : 'SELECT id FROM blogs WHERE slug = $1';
      
      const params = excludeId ? [uniqueSlug, excludeId] : [uniqueSlug];
      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return uniqueSlug;
      }

      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }
  }

  // Create a new blog
  async createBlog(blogData, userId) {
    const {
      title,
      content,
      author,
      featured_image_url,
      publication_date,
      status = 'draft',
      excerpt
    } = blogData;

    // Generate slug from title
    let slug = this.generateSlug(title);
    slug = await this.ensureUniqueSlug(slug);

    const query = `
      INSERT INTO blogs (
        title, slug, content, excerpt, author, 
        featured_image_url, publication_date, status, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      title,
      slug,
      content,
      excerpt || content.substring(0, 200) + '...', // Auto-generate excerpt if not provided
      author,
      featured_image_url,
      publication_date,
      status,
      userId
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Get all blogs (for admin) with pagination and filters
  async getAllBlogs(filters = {}) {
    const { status, search, page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        b.*,
        u.name as creator_name,
        u.email as creator_email
      FROM blogs b
      LEFT JOIN users u ON b.created_by = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND b.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (search) {
      query += ` AND (b.title ILIKE $${paramCount} OR b.content ILIKE $${paramCount} OR b.author ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Get total count
    const countQuery = query.replace(
      'SELECT b.*, u.name as creator_name, u.email as creator_email',
      'SELECT COUNT(*) as total'
    );
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Add sorting and pagination
    query += ` ORDER BY b.publication_date DESC, b.created_at DESC`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return {
      blogs: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Get published blogs (for students)
  async getPublishedBlogs(filters = {}) {
    const { search, page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        id, title, slug, excerpt, author, featured_image_url,
        publication_date, created_at, updated_at
      FROM blogs
      WHERE status = 'published'
        AND publication_date <= CURRENT_TIMESTAMP
    `;

    const params = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (title ILIKE $${paramCount} OR excerpt ILIKE $${paramCount} OR author ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Get total count
    const countQuery = query.replace(
      `SELECT 
        id, title, slug, excerpt, author, featured_image_url,
        publication_date, created_at, updated_at`,
      'SELECT COUNT(*) as total'
    );
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Add sorting and pagination
    query += ` ORDER BY publication_date DESC`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return {
      blogs: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Get blog by ID (admin)
  async getBlogById(id) {
    const query = `
      SELECT 
        b.*,
        u.name as creator_name,
        u.email as creator_email
      FROM blogs b
      LEFT JOIN users u ON b.created_by = u.id
      WHERE b.id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Get blog by slug (public)
  async getBlogBySlug(slug) {
    const query = `
      SELECT 
        id, title, slug, content, excerpt, author, 
        featured_image_url, publication_date, 
        created_at, updated_at
      FROM blogs
      WHERE slug = $1 AND status = 'published'
        AND publication_date <= CURRENT_TIMESTAMP
    `;

    const result = await pool.query(query, [slug]);
    return result.rows[0];
  }

  // Update blog
  async updateBlog(id, blogData) {
    const {
      title,
      content,
      author,
      featured_image_url,
      publication_date,
      status,
      excerpt
    } = blogData;

    // Generate new slug if title changed
    let slug = null;
    if (title) {
      slug = this.generateSlug(title);
      slug = await this.ensureUniqueSlug(slug, id);
    }

    const fields = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      fields.push(`title = $${paramCount}`);
      values.push(title);
      paramCount++;
    }

    if (slug !== null) {
      fields.push(`slug = $${paramCount}`);
      values.push(slug);
      paramCount++;
    }

    if (content !== undefined) {
      fields.push(`content = $${paramCount}`);
      values.push(content);
      paramCount++;
    }

    if (excerpt !== undefined) {
      fields.push(`excerpt = $${paramCount}`);
      values.push(excerpt);
      paramCount++;
    }

    if (author !== undefined) {
      fields.push(`author = $${paramCount}`);
      values.push(author);
      paramCount++;
    }

    if (featured_image_url !== undefined) {
      fields.push(`featured_image_url = $${paramCount}`);
      values.push(featured_image_url);
      paramCount++;
    }

    if (publication_date !== undefined) {
      fields.push(`publication_date = $${paramCount}`);
      values.push(publication_date);
      paramCount++;
    }

    if (status !== undefined) {
      fields.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const query = `
      UPDATE blogs 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Delete blog
  async deleteBlog(id) {
    const query = 'DELETE FROM blogs WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Toggle publish status
  async togglePublishStatus(id) {
    const query = `
      UPDATE blogs
      SET status = CASE 
        WHEN status = 'draft' THEN 'published'
        WHEN status = 'published' THEN 'draft'
      END,
      publication_date = CASE
        WHEN status = 'draft' AND publication_date IS NULL THEN CURRENT_TIMESTAMP
        ELSE publication_date
      END
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Get recent blogs (for homepage/featured)
  async getRecentBlogs(limit = 3) {
    const query = `
      SELECT 
        id, title, slug, excerpt, author, featured_image_url,
        publication_date, created_at
      FROM blogs
      WHERE status = 'published'
        AND publication_date <= CURRENT_TIMESTAMP
      ORDER BY publication_date DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
  }
}

module.exports = new BlogService();
