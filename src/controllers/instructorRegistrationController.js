const {
  createInstructorRegistration,
  getAllInstructorRegistrations,
  getInstructorRegistrationById,
  updateInstructorRegistration,
  deleteInstructorRegistration,
} = require('../services/instructorRegistrationService');

const registerInstructor = async (req, res, next) => {
  try {
    const { fullName, qualification, subjectExpertise, phoneNumber, role = 'instructor' } = req.body;

    // Validation
    if (!fullName || !qualification || !subjectExpertise || !phoneNumber) {
      return res.status(400).json({
        error: 'Full Name, Qualification, Subject Expertise, and Phone Number are required.',
      });
    }

    // Phone number format validation (basic)
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid phone number format.' });
    }

    // Validate role
    if (!['instructor', 'student'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either "instructor" or "student".' });
    }

    const registration = await createInstructorRegistration({
      fullName,
      qualification,
      subjectExpertise,
      phoneNumber,
      role,
    });

    res.status(201).json({
      message: 'Instructor registration received successfully.',
      registration,
    });
  } catch (error) {
    next(error);
  }
};

const getRegistrations = async (req, res, next) => {
  try {
    const registrations = await getAllInstructorRegistrations();
    res.json({ registrations });
  } catch (error) {
    next(error);
  }
};

const getRegistrationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const registration = await getInstructorRegistrationById(id);

    if (!registration) {
      return res.status(404).json({ error: 'Registration not found.' });
    }

    res.json({ registration });
  } catch (error) {
    next(error);
  }
};

const updateRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fullName, qualification, subjectExpertise, phoneNumber, role, status, notes } = req.body;

    // Validate required fields only if they are provided
    if (fullName !== undefined && !fullName) {
      return res.status(400).json({ error: 'Full Name cannot be empty.' });
    }
    if (qualification !== undefined && !qualification) {
      return res.status(400).json({ error: 'Qualification cannot be empty.' });
    }
    if (subjectExpertise !== undefined && !subjectExpertise) {
      return res.status(400).json({ error: 'Subject Expertise cannot be empty.' });
    }
    if (phoneNumber !== undefined && !phoneNumber) {
      return res.status(400).json({ error: 'Phone Number cannot be empty.' });
    }

    // Validate role if provided
    if (role && !['instructor', 'student'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either "instructor" or "student".' });
    }

    // Validate status if provided
    if (status && !['pending', 'contacted', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    const registration = await updateInstructorRegistration(id, {
      fullName,
      qualification,
      subjectExpertise,
      phoneNumber,
      role,
      status,
      notes,
    });

    if (!registration) {
      return res.status(404).json({ error: 'Registration not found.' });
    }

    res.json({
      message: 'Registration updated successfully.',
      registration,
    });
  } catch (error) {
    next(error);
  }
};

const deleteRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const registration = await deleteInstructorRegistration(id);

    if (!registration) {
      return res.status(404).json({ error: 'Registration not found.' });
    }

    res.json({
      message: 'Registration deleted successfully.',
      registration,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerInstructor,
  getRegistrations,
  getRegistrationById,
  updateRegistration,
  deleteRegistration,
};
