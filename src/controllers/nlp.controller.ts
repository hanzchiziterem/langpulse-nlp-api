import { Request, Response } from "express";
import { analyzeText } from "../services/nlp.service";
import { inputSchema } from "../schemas/input.schema";

export const analyzeTextHandler = async (req: Request, res: Response) => {
  const validation = inputSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ error: validation.error.errors });
    return;
  }
  try {
    const result = await analyzeText(validation.data.text);
    res.status(201).json({ result });
  } catch (error) {
    res.status(500).json({ message: "Error analyzing text" });
  }
};
