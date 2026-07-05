const db = require('../config/database');

// Submit contact form
exports.submitContactForm = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { 
      parentName, 
      childName, 
      phone, 
      email, 
      courseInterest,
      message,
      type = 'general' // 'general' or 'trial'
    } = req.body;

    // Validation
    if (!parentName || !phone || !email) {
      return res.status(400).json({ 
        error: 'Parent name, phone, and email are required' 
      });
    }

    // Insert into contact_requests table
    const result = await client.query(
      `INSERT INTO contact_requests 
       (parent_name, child_name, phone, email, course_interest, message, type, status, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
       RETURNING id`,
      [parentName, childName, phone, email, courseInterest, message, type, 'pending']
    );

    // TODO: Send email notification to admin
    // TODO: Send confirmation email to parent

    res.status(201).json({
      message: 'Contact form submitted successfully',
      id: result.rows[0].id
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({ 
      error: 'Failed to submit contact form. Please try again.' 
    });
  } finally {
    client.release();
  }
};

// Get all contact requests (admin only)
exports.getAllContactRequests = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM contact_requests WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (type) {
      query += ` AND type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await client.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM contact_requests WHERE 1=1';
    const countParams = [];
    let countParamCount = 1;

    if (status) {
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
      countParamCount++;
    }

    if (type) {
      countQuery += ` AND type = $${countParamCount}`;
      countParams.push(type);
    }

    const countResult = await client.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      requests: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching contact requests:', error);
    res.status(500).json({ 
      error: 'Failed to fetch contact requests' 
    });
  } finally {
    client.release();
  }
};

// Update contact request status (admin only)
exports.updateContactRequestStatus = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['pending', 'contacted', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status' 
      });
    }

    await client.query(
      `UPDATE contact_requests 
       SET status = $1, notes = $2, updated_at = NOW() 
       WHERE id = $3`,
      [status, notes, id]
    );

    res.json({ message: 'Contact request updated successfully' });
  } catch (error) {
    console.error('Error updating contact request:', error);
    res.status(500).json({ 
      error: 'Failed to update contact request' 
    });
  } finally {
    client.release();
  }
};
