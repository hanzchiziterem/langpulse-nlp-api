import {Request, Response } from "express";
import prisma from "../lib/prisma";
import { analyzeText } from "../services/nlp.service";
import { inputSchema } from "../schemas/input.schema";
import prisma from "../client/prisma";

export const analyzeTextHandler = async (
  req: Request<{}, {}, AnalyzeInput>,
  res: Response
):Promise<void> => {
  const { text } = req.body;
  const validation = inputSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ error: validation.error.errors });
    return;
  }
  try {
    const result = await analyzeText(req.user!.id, text);
    res.status(201).json({ result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error analyzing text" });
  }
};

export const getAnalysisHistory = async (req: Request, res: Response) => {
try {
  const user = (req as any).user;
  const history = await prisma.analysis.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({success: true, data: history});
  
} catch (error) {
     console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
}
}

export const downloadAnalysisHistory = async (req: Request, res: Response) => {
const user = (req as any).user;

  export const downloadAnalysisHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  const data = await prisma.analysis.findMany({
    where: { userId: req.user!.id },
    select: { text: true, result: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=analysis_report.json"
  );
  res.send(JSON.stringify(data, null, 2));
};
