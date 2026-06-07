/**
 * Admin Access Control Middleware
 * Ensures all admins have full access to all system resources
 * No restrictions between admins - they all have equal permissions
 */

const adminAccessControl = (req, res, next) => {
  // Verify user is authenticated and is an admin
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // All admins have full access to all resources
  // No additional restrictions are applied
  req.isAdmin = true;
  req.hasFullAccess = true;

  console.log(`[AdminAccess] Admin ${req.user.id} (${req.user.email}) accessing: ${req.method} ${req.path}`);

  next();
};

/**
 * Middleware to ensure admin has access to specific resource
 * Since all admins have full access, this just verifies admin status
 */
const requireAdminAccess = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // All admins can access all resources
  next();
};

/**
 * Middleware to log admin actions for audit trail
 */
const auditAdminAction = (action) => {
  return (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      const auditLog = {
        adminId: req.user.id,
        adminEmail: req.user.email,
        action: action,
        method: req.method,
        path: req.path,
        body: req.body,
        timestamp: new Date().toISOString(),
        ip: req.ip
      };

      console.log('[AdminAudit]', JSON.stringify(auditLog));

      // Optionally store in database for audit trail
      // await storeAuditLog(auditLog);
    }

    next();
  };
};

module.exports = {
  adminAccessControl,
  requireAdminAccess,
  auditAdminAction
};
