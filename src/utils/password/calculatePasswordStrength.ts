export const calculatePasswordStrength = (password: string): number => {
  if (!password) return 0;

  let score = 0;
  const requirements = {
    length: 0,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumbers: false,
    hasSpecialChars: false,
    noRepeats: true,
    noSequential: true
  };

  const length = password.length;
  requirements.length = Math.min(30, Math.floor(length * 2));
  score += requirements.length;

  if (/[A-Z]/.test(password)) {
    requirements.hasUpperCase = true;
    score += 10;
  }

  if (/[a-z]/.test(password)) {
    requirements.hasLowerCase = true;
    score += 10;
  }

  if (/\d/.test(password)) {
    requirements.hasNumbers = true;
    score += 10;
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    requirements.hasSpecialChars = true;
    score += 15;
  }

  if (!/(.)\1/.test(password)) {
    requirements.noRepeats = true;
    score += 10;
  }

  const sequentialChars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let isSequential = false;
  for (let i = 0; i < password.length - 2; i++) {
    const trio = password.slice(i, i + 3).toLowerCase();
    if (sequentialChars.includes(trio) || 
        sequentialChars.split('').reverse().join('').includes(trio)) {
      isSequential = true;
      break;
    }
  }
  if (!isSequential) {
    requirements.noSequential = true;
    score += 15;
  }

  return Math.min(100, Math.max(0, score));
};

