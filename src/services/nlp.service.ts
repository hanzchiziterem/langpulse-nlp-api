import { openai } from "../app";

//Add this later as param when implementing psql, userId: number,
export const analyzeText = async (text: string) => {
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

    const result =
      completion.choices[0].message?.content || "No result returned";

    // Save to DB like before (i will use Prisma)
    // await prisma.analysis.create({ data: { userId, text, result } });
    
    return JSON.parse(result);
  } catch (error: any) {
    console.error("OpenAI API Error:", error.message);
    throw new Error("Failed to analyze text");
  }
};
