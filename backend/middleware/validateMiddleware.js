/**
 * ====================================================
 * VALIDATION MIDDLEWARE
 * Reusable request body validators for all routes.
 * Returns user-friendly 400 messages for invalid data.
 * ====================================================
 */

// ---- helpers ----
const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
const isValidPhone = (v) => /^[6-9]\d{9}$/.test(String(v || '').replace(/\D/g, ''));
const isNonEmpty = (v) => v !== undefined && v !== null && String(v).trim().length > 0;
const isPositiveNum = (v) => !isNaN(Number(v)) && Number(v) >= 0;
const validGenders = ['Male', 'Female', 'Other', 'male', 'female', 'other'];
const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown', ''];

function validationError(res, message, field = null) {
  return res.status(400).json({
    success: false,
    error: 'VALIDATION_ERROR',
    field,
    message,
  });
}

// ---- Family Registration ----
const validateFamily = (req, res, next) => {
  const { headName, phone, area, society } = req.body;

  if (!isNonEmpty(headName))
    return validationError(res, 'Family head name is required.', 'headName');
  if (String(headName).trim().length < 3)
    return validationError(res, 'Family head name must be at least 3 characters.', 'headName');
  if (phone && !isValidPhone(phone))
    return validationError(res, 'Please enter a valid 10-digit Indian mobile number.', 'phone');

  next();
};

// ---- Patient / Member Registration ----
const validatePatient = (req, res, next) => {
  const { name, age, gender, relation } = req.body;

  if (!isNonEmpty(name))
    return validationError(res, 'Patient name is required.', 'name');
  if (String(name).trim().length < 2)
    return validationError(res, 'Patient name must be at least 2 characters.', 'name');
  if (age !== undefined && age !== null && age !== '') {
    const ageNum = Number(age);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 130)
      return validationError(res, 'Please enter a valid age between 0 and 130.', 'age');
  }
  if (gender && !validGenders.includes(gender))
    return validationError(res, 'Gender must be Male, Female, or Other.', 'gender');

  next();
};

// ---- Consultation ----
const validateConsultation = (req, res, next) => {
  const { patId, clinicId, visitDate } = req.body;

  if (!isNonEmpty(patId) && !isNonEmpty(req.body.patientId))
    return validationError(res, 'Patient ID is required to create a consultation.', 'patId');

  next();
};

// ---- Prescription ----
const validatePrescription = (req, res, next) => {
  const { patId, medicines } = req.body;

  if (!isNonEmpty(patId) && !isNonEmpty(req.body.patientId))
    return validationError(res, 'Patient ID is required for the prescription.', 'patId');

  next();
};

// ---- Billing ----
const validateBill = (req, res, next) => {
  const { patId, amount, items } = req.body;

  if (!isNonEmpty(patId) && !isNonEmpty(req.body.patientId))
    return validationError(res, 'Patient ID is required to create a bill.', 'patId');
  if (amount !== undefined && !isPositiveNum(amount))
    return validationError(res, 'Bill amount must be a non-negative number.', 'amount');

  next();
};

// ---- Medical Certificate ----
const validateCertificate = (req, res, next) => {
  const { patientName, patId, patientId } = req.body;

  if (!isNonEmpty(patientName) && !isNonEmpty(patId) && !isNonEmpty(patientId))
    return validationError(res, 'Patient Name or ID is required for the certificate.', 'patientName');

  next();
};

// ---- Medicine / Inventory ----
const validateMedicine = (req, res, next) => {
  const { name } = req.body;

  if (!isNonEmpty(name))
    return validationError(res, 'Medicine name is required.', 'name');
  if (String(name).trim().length < 2)
    return validationError(res, 'Medicine name must be at least 2 characters.', 'name');

  next();
};

// ---- Feedback / Support ----
const validateFeedback = (req, res, next) => {
  const { subject, message } = req.body;

  if (!isNonEmpty(subject))
    return validationError(res, 'Feedback subject is required.', 'subject');
  if (!isNonEmpty(message))
    return validationError(res, 'Feedback message is required.', 'message');

  next();
};

// ---- Follow-Up ----
const validateFollowUp = (req, res, next) => {
  const { patId, followUpDate } = req.body;

  if (!isNonEmpty(patId) && !isNonEmpty(req.body.patientId))
    return validationError(res, 'Patient ID is required for the follow-up.', 'patId');
  if (!isNonEmpty(followUpDate))
    return validationError(res, 'Follow-up date is required.', 'followUpDate');

  next();
};

// ---- Diagnosis ----
const validateDiagnosis = (req, res, next) => {
  const { diagnosis, patId } = req.body;

  if (!isNonEmpty(patId) && !isNonEmpty(req.body.patientId))
    return validationError(res, 'Patient ID is required to record a diagnosis.', 'patId');
  if (!isNonEmpty(diagnosis) && !isNonEmpty(req.body.name))
    return validationError(res, 'Diagnosis name is required.', 'diagnosis');

  next();
};

// ---- Payment ----
const validatePayment = (req, res, next) => {
  const { billId, amount, method } = req.body;

  if (!isNonEmpty(billId) && !isNonEmpty(req.body.patId))
    return validationError(res, 'Bill ID or Patient ID is required for payment.', 'billId');
  if (!isPositiveNum(amount))
    return validationError(res, 'A valid payment amount is required.', 'amount');
  if (Number(amount) <= 0)
    return validationError(res, 'Payment amount must be greater than zero.', 'amount');

  next();
};

// ---- History ----
const validateHistory = (req, res, next) => {
  const { patId } = req.body;

  if (!isNonEmpty(patId) && !isNonEmpty(req.body.patientId))
    return validationError(res, 'Patient ID is required to save medical history.', 'patId');

  next();
};

module.exports = {
  validateFamily,
  validatePatient,
  validateConsultation,
  validatePrescription,
  validateBill,
  validateCertificate,
  validateMedicine,
  validateFeedback,
  validateFollowUp,
  validateDiagnosis,
  validatePayment,
  validateHistory,
};
