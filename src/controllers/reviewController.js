const db = require('../config/database');

// Submit a review (public endpoint)
exports.submitReview = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { 
      name, 
      role, 
      rating,
      message,
      email,
      phone,
      courseName
    } = req.body;

    // Validation
    if (!name || !role || !rating || !message) {
      return res.status(400).json({ 
        error: 'Name, role, rating, and message are required' 
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        error: 'Rating must be between 1 and 5' 
      });
    }

    if (message.trim().length < 10) {
      return res.status(400).json({ 
        error: 'Review message must be at least 10 characters long' 
      });
    }

    // Insert into reviews table with pending status
    const result = await client.query(
      `INSERT INTO reviews 
       (name, role, rating, message, email, phone, course_name, status, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
       RETURNING id`,
      [name, role, rating, message, email, phone, courseName, 'pending']
    );

    // Emit Socket.IO event to notify admin of new review
    if (global.io) {
      global.io.to('admin-room').emit('new-review-submitted', {
        reviewId: result.rows[0].id,
        name,
        rating,
        message: 'A new review has been submitted and is awaiting approval'
      });
    }

    res.status(201).json({
      message: 'Review submitted successfully. It will be visible after admin approval.',
      id: result.rows[0].id
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ 
      error: 'Failed to submit review. Please try again.' 
    });
  } finally {
    client.release();
  }
};

// Get approved reviews only (public endpoint)
exports.getApprovedReviews = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { limit = 50, rating } = req.query;

    let query = `
      SELECT id, name, role, rating, message, course_name, created_at 
      FROM reviews 
      WHERE status = 'approved'
    `;
    const params = [];
    let paramCount = 1;

    if (rating) {
      query += ` AND rating = $${paramCount}`;
      params.push(rating);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
    params.push(limit);

    const result = await client.query(query, params);

    res.json({
      reviews: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching approved reviews:', error);
    res.status(500).json({ 
      error: 'Failed to fetch reviews' 
    });
  } finally {
    client.release();
  }
};

// Get all reviews with filtering (admin only)
exports.getAllReviews = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { status, rating, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        r.*,
        u.name as reviewed_by_name
      FROM reviews r
      LEFT JOIN users u ON r.reviewed_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND r.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (rating) {
      query += ` AND r.rating = $${paramCount}`;
      params.push(rating);
      paramCount++;
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await client.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM reviews WHERE 1=1';
    const countParams = [];
    let countParamCount = 1;

    if (status) {
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
      countParamCount++;
    }

    if (rating) {
      countQuery += ` AND rating = $${countParamCount}`;
      countParams.push(rating);
    }

    const countResult = await client.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      reviews: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching all reviews:', error);
    res.status(500).json({ 
      error: 'Failed to fetch reviews' 
    });
  } finally {
    client.release();
  }
};

// Get pending reviews (admin only)
exports.getPendingReviews = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM reviews 
       WHERE status = 'pending' 
       ORDER BY created_at DESC`
    );

    res.json({
      reviews: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pending reviews' 
    });
  } finally {
    client.release();
  }
};

// Get single review by ID (admin only)
exports.getReviewById = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;

    const result = await client.query(
      `SELECT 
        r.*,
        u.name as reviewed_by_name
       FROM reviews r
       LEFT JOIN users u ON r.reviewed_by = u.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({ review: result.rows[0] });
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({ 
      error: 'Failed to fetch review' 
    });
  } finally {
    client.release();
  }
};

// Approve review (admin only)
exports.approveReview = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const adminId = req.user.id; // From auth middleware

    // Get review details before updating
    const reviewResult = await client.query(
      'SELECT * FROM reviews WHERE id = $1',
      [id]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    await client.query(
      `UPDATE reviews 
       SET status = 'approved', 
           reviewed_by = $1, 
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [adminId, id]
    );

    // Emit Socket.IO event for real-time update
    if (global.io) {
      global.io.emit('review-approved', {
        reviewId: id,
        message: 'A new review has been approved and is now visible'
      });
    }

    res.json({ message: 'Review approved successfully' });
  } catch (error) {
    console.error('Error approving review:', error);
    res.status(500).json({ 
      error: 'Failed to approve review' 
    });
  } finally {
    client.release();
  }
};

// Reject review (admin only)
exports.rejectReview = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;
    const adminId = req.user.id; // From auth middleware

    await client.query(
      `UPDATE reviews 
       SET status = 'rejected', 
           admin_notes = $1,
           reviewed_by = $2, 
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [adminNotes, adminId, id]
    );

    res.json({ message: 'Review rejected successfully' });
  } catch (error) {
    console.error('Error rejecting review:', error);
    res.status(500).json({ 
      error: 'Failed to reject review' 
    });
  } finally {
    client.release();
  }
};

// Update review (admin only)
exports.updateReview = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { name, role, rating, message, courseName, adminNotes } = req.body;

    // Validation
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ 
        error: 'Rating must be between 1 and 5' 
      });
    }

    // Build dynamic update query
    const updates = [];
    const params = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      params.push(name);
      paramCount++;
    }

    if (role !== undefined) {
      updates.push(`role = $${paramCount}`);
      params.push(role);
      paramCount++;
    }

    if (rating !== undefined) {
      updates.push(`rating = $${paramCount}`);
      params.push(rating);
      paramCount++;
    }

    if (message !== undefined) {
      updates.push(`message = $${paramCount}`);
      params.push(message);
      paramCount++;
    }

    if (courseName !== undefined) {
      updates.push(`course_name = $${paramCount}`);
      params.push(courseName);
      paramCount++;
    }

    if (adminNotes !== undefined) {
      updates.push(`admin_notes = $${paramCount}`);
      params.push(adminNotes);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const query = `UPDATE reviews SET ${updates.join(', ')} WHERE id = $${paramCount}`;
    
    await client.query(query, params);

    res.json({ message: 'Review updated successfully' });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ 
      error: 'Failed to update review' 
    });
  } finally {
    client.release();
  }
};

// Delete review (admin only)
exports.deleteReview = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;

    const result = await client.query(
      'DELETE FROM reviews WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ 
      error: 'Failed to delete review' 
    });
  } finally {
    client.release();
  }
};

// Get review statistics (admin only)
exports.getReviewStats = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const statsResult = await client.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
        COUNT(*) as total_count,
        AVG(rating) FILTER (WHERE status = 'approved') as average_rating
       FROM reviews`
    );

    const ratingDistribution = await client.query(
      `SELECT rating, COUNT(*) as count
       FROM reviews
       WHERE status = 'approved'
       GROUP BY rating
       ORDER BY rating DESC`
    );

    res.json({
      stats: statsResult.rows[0],
      ratingDistribution: ratingDistribution.rows
    });
  } catch (error) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch review statistics' 
    });
  } finally {
    client.release();
  }
};
