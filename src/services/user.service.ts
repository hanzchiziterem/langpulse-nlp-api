import { JsonValue } from "@prisma/client/runtime/library";
import prisma from "../client/prisma";
import { Prisma } from "../generated/prisma";
import { v2 as cloudinary } from "cloudinary";
import { extractPublicId } from "../utils/extractPublicId";
interface UserProfile {
  id: string;
  profileImage: string | null;
  name: string;
  email: string;
}

export const getUserProfileService = async (
  userId: string
): Promise<UserProfile> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      profileImage: true,
      name: true,
      email: true,
    },
  });
  if (!user) {
    throw new Error("User not found.");
  }

  return user;
};

interface UserAnalysis {
  result: JsonValue;
  id: string;
  text: string;
  createdAt: Date;
}

export const getUserAnalysisHistoryService = async (
  userId: string
): Promise<UserAnalysis[]> => {
  return await prisma.analysis.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      text: true,
      result: true,
      createdAt: true,
    },
  });
};

export const deleteUserAnalysisService = async (
  userId: string,
  analysisId: string
): Promise<void> => {
  const analysis = await prisma.analysis.findFirst({
    where: { id: analysisId, userId },
  });

  if (!analysis) throw new Error("Analysis not found or not yours!");

  await prisma.analysis.delete({ where: { id: analysisId } });
};

type UpdateProfileData = {
  name?: string;
  profileImage?: string | null; // Make sure this is included
};

export const updateUserProfileService = async (
  userId: string,
  updateData: UpdateProfileData
) => {
  // Validate at least one field is being updated
  if (!updateData.name && !updateData.profileImage) {
    throw new Error(
      "At least one field (name or profileImage) must be provided."
    );
  }

  // Prepare the update payload
  const payload: Prisma.UserUpdateInput = {};

  if (updateData.name !== undefined) {
    payload.name = updateData.name;
  }

  if (updateData.profileImage !== undefined) {
    // If empty string is passed, we'll interpret as "remove picture"
    payload.profileImage = updateData.profileImage || null;
  }

  // Perform the update
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: payload,
    select: {
      id: true,
      profileImage: true,
      name: true,
      email: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

export const deleteUserProfileService = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profileImage: true },
  });
  if (!user?.profileImage) throw new Error("No profile picture found.");
  const publicId = extractPublicId(user.profileImage);
  if (!publicId) throw new Error("Invalid Cloudinary URL format.");
  await cloudinary.uploader.destroy(publicId, { invalidate: true });
  await prisma.user.update({
    where: { id: userId },
    data: { profileImage: null },
  });
};

export const deleteUserAccountService = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      analyses: true,
      settings: true,
    },
  });

  if (!user) throw new Error("User not found.");

  if (user.profileImage) {
    await deleteUserProfileService(userId);
  }

  return await prisma.$transaction(async (tx) => {
    if (user.analyses.length > 0) {
      await tx.analysis.deleteMany({
        where: { userId },
      });
    }

    if (user.settings) {
      await tx.userSettings.delete({
        where: { userId },
      });
    }

    return await tx.user.delete({
      where: { id: userId },
    });
  });
};
