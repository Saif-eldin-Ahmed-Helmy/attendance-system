import * as yup from 'yup';

/**
 * Validation Schemas using Yup
 * Provides consistent form validation across the application
 */

export const loginSchema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required')
});

export const registerSchema = yup.object({
  name: yup
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .required('Name is required'),
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    )
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
  gender: yup
    .string()
    .oneOf(['male', 'female', 'not_specified'], 'Please select a valid gender')
    .optional(),
  dateOfBirth: yup
    .date()
    .max(new Date(), 'Date of birth cannot be in the future')
    .optional()
});

export const subjectSchema = yup.object({
  name: yup
    .string()
    .min(3, 'Subject name must be at least 3 characters')
    .max(100, 'Subject name must be less than 100 characters')
    .required('Subject name is required'),
  code: yup
    .string()
    .min(2, 'Subject code must be at least 2 characters')
    .max(20, 'Subject code must be less than 20 characters')
    .matches(/^[A-Z0-9]+$/, 'Subject code must contain only uppercase letters and numbers')
    .required('Subject code is required'),
  level: yup
    .number()
    .oneOf([1, 2, 3, 4], 'Level must be between 1 and 4')
    .required('Level is required'),
  startWeek: yup
    .date()
    .min(new Date(new Date().getFullYear(), 0, 1), 'Start date must be in the current year')
    .required('Start week is required')
});

export const studentSchema = yup.object({
  name: yup
    .string()
    .min(2, 'Student name must be at least 2 characters')
    .max(100, 'Student name must be less than 100 characters')
    .required('Student name is required'),
  id: yup
    .string()
    .matches(/^\d{6,}$/, 'Student ID must be at least 6 digits')
    .required('Student ID is required'),
  level: yup
    .number()
    .oneOf([1, 2, 3, 4], 'Level must be between 1 and 4')
    .required('Level is required')
});

export const announcementSchema = yup.object({
  title: yup
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters')
    .required('Title is required'),
  content: yup
    .string()
    .min(10, 'Content must be at least 10 characters')
    .max(2000, 'Content must be less than 2000 characters')
    .required('Content is required'),
  subject: yup
    .string()
    .optional()
});

export const materialSchema = yup.object({
  title: yup
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters')
    .required('Title is required'),
  description: yup
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  subject: yup
    .string()
    .required('Subject is required')
});

/**
 * Custom validation functions
 */
export const validateStudentId = (id: string): boolean => {
  return /^\d{6,}$/.test(id);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Form validation helpers
 */
export const getFieldError = (errors: any, fieldName: string): string | undefined => {
  return errors[fieldName]?.message;
};

export const hasFieldError = (errors: any, fieldName: string): boolean => {
  return !!errors[fieldName];
};
