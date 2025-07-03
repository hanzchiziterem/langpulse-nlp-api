import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../client/prisma";

const JWT_SECRET = process.env.JWT_SECRET;

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  
  const token = authHeader.split(" ")[1];
  const blacklisted = await prisma.blacklistedToken.findUnique({
    where: { token },
  });

   if (blacklisted) {
    return res.status(401).json({ message: "Token is revoked. Please sign in again." });
  }
  
  try {
    if (!JWT_SECRET) {
      return;
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};
