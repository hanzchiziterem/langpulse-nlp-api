import jwt from "jsonwebtoken";

export const getUserIdFromToken = (token: string): string | null => {
  const decoded = jwt.decode(token);
  
  if (!decoded || typeof decoded !== 'object') return null;
  if ('id' in decoded) return decoded.id;
  
  return null;
};
