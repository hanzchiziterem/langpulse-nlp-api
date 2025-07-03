import { openai } from "../app";
import prisma from "../client/prisma";

export const analyzeText = async (userId:string, text: string) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Analyze this text: "${text}". 
          make sure to give me the sentiment (positive/neutral/negative), tone, and key topics.
          Return the result as JSON like this:
          {
            "sentiment": "...",
            "tone": "...", 
            "topics": ["...", "...", "..."]
          }`,
        },
      ],
      temperature: 0.7,
    });

    const rawResult =
      completion.choices[0].message?.content || "{}";
    
    const parsedResult = JSON.parse(rawResult);

    await prisma.analysis.create({ data: { userId, text, result: parsedResult } });
    
    return parsedResult;
  } catch (error: any) {
    console.error("OpenAI API Error:", error.message);
    throw new Error("Failed to analyze text");
  }
};
