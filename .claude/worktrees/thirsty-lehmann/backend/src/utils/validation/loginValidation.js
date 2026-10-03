const validateLogin = (data) => {
    const { email, password } = data;
  
    if (!email) {
      return { isValid: false, message: 'Email is required' };
    }
  
    if (!email.includes('@')) {
      return { isValid: false, message: 'Please provide a valid email' };
    }
  
    if (!password) {
      return { isValid: false, message: 'Password is required' };
    }
  
    if (password.length < 6) {
      return { isValid: false, message: 'Password must be at least 6 characters' };
    }
  
    return { isValid: true };
  };
  
  module.exports = validateLogin;