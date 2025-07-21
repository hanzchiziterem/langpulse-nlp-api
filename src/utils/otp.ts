export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const verifyOTP = (expiresAt: Date | null): boolean => {
  return !!expiresAt && expiresAt > new Date();
};
