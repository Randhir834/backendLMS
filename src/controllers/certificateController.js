const {
  getCertificatesByUser,
  getCertificateById,
  createCertificate,
  markCertificateDownloaded,
  verifyCertificate,
  getCertificateStats,
} = require('../services/certificateService');

const getMyCertificates = async (req, res, next) => {
  try {
    const certificates = await getCertificatesByUser(req.user.id);
    res.json({ 
      certificates,
      total: certificates.length 
    });
  } catch (error) {
    next(error);
  }
};

const getCertificate = async (req, res, next) => {
  try {
    const certificate = await getCertificateById(req.params.id);
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    // Check if user owns this certificate
    if (certificate.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({ certificate });
  } catch (error) {
    next(error);
  }
};

const downloadCertificate = async (req, res, next) => {
  try {
    const certificate = await getCertificateById(req.params.id);
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    // Check if user owns this certificate
    if (certificate.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Mark as downloaded
    const updated = await markCertificateDownloaded(req.params.id);
    res.json({ 
      message: 'Certificate download recorded',
      certificate: updated 
    });
  } catch (error) {
    next(error);
  }
};

const verifyCertificatePublic = async (req, res, next) => {
  try {
    const { certificate_number } = req.params;
    const certificate = await verifyCertificate(certificate_number);
    
    if (!certificate) {
      return res.status(404).json({ 
        valid: false,
        error: 'Certificate not found' 
      });
    }

    // Check if certificate is still valid
    const now = new Date();
    const isValid = now >= new Date(certificate.valid_from) && now <= new Date(certificate.valid_until);

    res.json({ 
      valid: isValid,
      certificate: {
        certificate_number: certificate.certificate_number,
        student_name: certificate.student_name,
        course_title: certificate.course_title,
        issued_date: certificate.issued_date,
        valid_from: certificate.valid_from,
        valid_until: certificate.valid_until,
        instructor_name: certificate.instructor_name
      }
    });
  } catch (error) {
    next(error);
  }
};

const getCertificatesStats = async (req, res, next) => {
  try {
    // Admin only
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const stats = await getCertificateStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyCertificates,
  getCertificate,
  downloadCertificate,
  verifyCertificatePublic,
  getCertificatesStats,
};
