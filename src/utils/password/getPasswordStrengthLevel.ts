export const getPasswordStrengthLevel = (score: number): string => {
  if (score >= 80) return 'strong';
  if (score >= 50) return 'medium';
  return 'weak';
};