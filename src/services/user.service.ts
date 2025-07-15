import prisma from "../client/prisma";

export const getUserProfileService = async (userId: string) => {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      profileImage: true,
      name: true,
      email: true,
    }
  });
};

export const getUserAnalysisHistoryService = async (userId: string) => {
  return await prisma.analysis.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      text: true,
      result: true,
      createdAt: true
    }
  });
};

export const deleteUserAnalysisService = async (userId: string, analysisId: string) => {
  const analysis = await prisma.analysis.findFirst({
    where: { id: analysisId, userId }
  });
  
  if (!analysis) throw new Error("Analysis not found or not yours!");
  
  await prisma.analysis.delete({ where: { id: analysisId } });
};

