import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided." });
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
  }
  try {
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment.");
    }
    //Decoding + attaching 'req.user'
    const decoded = jwt.verify(token, JWT_SECRET!) as {
      id: string;
    };
    (req as any).user = { id: decoded.id };
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};
