import { body, validationResult } from 'express-validator';

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      details: errors.array()
    });
  }
  next();
};

export const validateAuth = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  validateRequest
];

export const validateSignup = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  validateRequest
];

export const validateInterviewSetup = [
  body('industry')
    .notEmpty()
    .withMessage('Industry is required'),
  body('difficulty')
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),
  body('personality')
    .isIn(['intimidator', 'friendly', 'robotic', 'curveball'])
    .withMessage('Personality must be intimidator, friendly, robotic, or curveball'),
  validateRequest
];

export const validateMessage = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Message content is required'),
  body('sender')
    .isIn(['user', 'ai'])
    .withMessage('Sender must be user or ai'),
  validateRequest
];