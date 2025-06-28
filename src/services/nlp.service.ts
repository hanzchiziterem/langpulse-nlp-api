import { openai } from "../app";
import prisma from "../lib/prisma";

interface AnalysisResult {
  sentiment: string;
  tone: string;
  topics: string[];
}

export const analyzeText = async (
  userId: string,
  text: string
): Promise<AnalysisResult> => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Analyze this text: "${text}". 
          Give me sentiment, tone, key topics.
          Return JSON:
          {
            "sentiment": "...",
            "tone": "...", 
            "topics": ["...", "...", "..."]
          }`,
        },
      ],
      temperature: 0.7,
    });

    const result =
      completion.choices[0].message?.content || "No result returned";

    await prisma.analysis.create({ data: { userId, text, result } });

    const cleaned = result.trim().replace(/```json|```/g, "");
    const parsedJSONResult: AnalysisResult = JSON.parse(cleaned);

    return parsedJSONResult;
  } catch (error) {
    if (error instanceof Error) {
      console.error("OpenAI API Error: ", error.message);
    } else {
      console.log("Unknown Error: ", error);
    }
    throw new Error("Failed to analyze text.");
  }
};
