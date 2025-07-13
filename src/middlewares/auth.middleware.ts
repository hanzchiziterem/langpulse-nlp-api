import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_TOKEN_SECRET = process.env.JWT_TOKEN_SECRET!;

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ success: false, message: "Unauthorized or missing authorization header." });
    return;
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_TOKEN_SECRET);
    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: "Invalid or expired access token." });
  }
};
