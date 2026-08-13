// Input validation middleware
const { body, param, query, validationResult } = require('express-validator');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const validateRegister = [
  body('FirstName').trim().notEmpty().withMessage('First name is required').isLength({ max: 50 }),
  body('LastName').trim().notEmpty().withMessage('Last name is required').isLength({ max: 50 }),
  body('Email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('ContactNumber').trim().notEmpty().withMessage('Contact number is required'),
  body('Password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidation
];

const validateLogin = [
  body('Email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('Password').notEmpty().withMessage('Password is required'),
  handleValidation
];

const validateReservation = [
  body('RoomNumber').trim().notEmpty().withMessage('Room number is required'),
  body('CheckInDate').isISO8601().withMessage('Valid check-in date required'),
  body('CheckOutDate').isISO8601().withMessage('Valid check-out date required'),
  body('NumOccupants').isInt({ min: 1 }).withMessage('Number of occupants must be at least 1'),
  handleValidation
];

const validateEventBooking = [
  body('HallID').isInt({ min: 1 }).withMessage('Valid hall ID required'),
  body('EventType').trim().notEmpty().withMessage('Event type is required'),
  body('EventDate').isISO8601().withMessage('Valid event date required'),
  body('StartTime').matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Valid start time required (HH:MM)'),
  body('EndTime').matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Valid end time required (HH:MM)'),
  body('ExpectedAttendees').isInt({ min: 1 }).withMessage('Expected attendees must be at least 1'),
  handleValidation
];

const validateFeedback = [
  body('Rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('Comments').optional().trim().isLength({ max: 1000 }),
  handleValidation
];

const validatePayment = [
  body('AmountPaid').isFloat({ min: 0.01 }).withMessage('Amount paid must be greater than 0'),
  handleValidation
];

module.exports = {
  validateRegister,
  validateLogin,
  validateReservation,
  validateEventBooking,
  validateFeedback,
  validatePayment,
  handleValidation
};