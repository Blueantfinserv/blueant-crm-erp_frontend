export type LoginFormValues = {
  employeeCode: string;
  password: string;
  rememberMe: boolean;
};

export type LoginFieldErrors = {
  employeeCode?: string;
  password?: string;
  confirmPassword?: string;
};

export const validateEmployeeCode = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return 'Employee Code is required.';
  if (trimmed.length < 3) return 'Employee Code must be at least 3 characters.';
  if (trimmed.length > 30) return 'Employee Code must not exceed 30 characters.';
  return '';
};

export const validateEmail = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Enter a valid email address.';
  return '';
};

export const validatePassword = (value: string) => {
  if (!value) return 'Password is required.';
  if (value.length < 8) return 'Password must be at least 8 characters.';
  return '';
};

export const validateStrongPassword = (value: string) => {
  if (!value) return 'Password is required.';
  if (value.length < 8) return 'Password must be at least 8 characters.';
  if (!/[a-z]/.test(value)) return 'Password must include a lowercase letter.';
  if (!/[A-Z]/.test(value)) return 'Password must include an uppercase letter.';
  if (!/[^A-Za-z0-9]/.test(value)) return 'Password must include a special character.';
  return '';
};

export const validateConfirmPassword = (password: string, confirmPassword: string) => {
  if (!confirmPassword) return 'Confirm Password is required.';
  if (password !== confirmPassword) return 'Passwords do not match.';
  return '';
};

export const validateResetToken = (value: string) => {
  if (!value.trim()) return 'Reset token is required.';
  return '';
};

export const validateRegisterForm = (values: { email: string; password: string; confirmPassword: string }) => {
  const email = validateEmail(values.email);
  const password = validateStrongPassword(values.password);
  const confirmPassword = validateConfirmPassword(values.password, values.confirmPassword);
  return {
    ...(email ? { email } : null),
    ...(password ? { password } : null),
    ...(confirmPassword ? { confirmPassword } : null),
  };
};

export const validateLoginForm = (values: Pick<LoginFormValues, 'employeeCode' | 'password'>): LoginFieldErrors => {
  const employeeCode = validateEmployeeCode(values.employeeCode);
  const password = validatePassword(values.password);
  return {
    ...(employeeCode ? { employeeCode } : null),
    ...(password ? { password } : null),
  };
};
