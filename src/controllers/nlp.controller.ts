import { Request, Response } from "express";
import { analyzeText } from "../services/nlp.service";
import { inputSchema } from "../schemas/input.schema";
import prisma from "../lib/prisma";

export const analyzeTextHandler = async (req: Request, res: Response) => {
  const {text} = req.body;
  const user = (req as any).user;
  const validation = inputSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ error: validation.error.errors });
    return;
  }
  try {
    const result = await analyzeText(user.id, text);
    res.status(201).json({ result });
  } catch (error) {
    res.status(500).json({ message: "Error analyzing text" });
  }
};

export const getAnalysisHistory = async (req: Request, res: Response) => {
  const user = (req as any).user;

  const history = await prisma.analysis.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  res.json(history);
}