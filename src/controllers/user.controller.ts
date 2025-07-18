import { Request, Response } from "express";
import {
  getUserProfileService,
  deleteUserAnalysisService,
  getUserAnalysisHistoryService,
  updateUserProfileService,
  deleteUserProfileService,
  deleteUserAccountService,
} from "../services/user.service";
import { uploadImage } from "../services/upload.service";
import prisma from "../client/prisma";
import { verifyPassword } from "../lib/auth";

export const getUserProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const profile = await getUserProfileService(req.user?.id!);
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: "Oops! Profile broken." });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) throw new Error("User not authenticated");

    const updatedUser = await updateUserProfileService(req.user.id, req.body);

    res.status(200).json({
      success: true,
      message: "User profile has been updated.",
      data: updatedUser,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const uploadProfilePicture = async (req: Request, res: Response) => {
  try {
    if (!req.file) throw new Error("No file uploaded");
    if (!req.user) throw new Error("User not authenticated");

    const imageUrl = await uploadImage(req.file.path);
    if (!req.user) {
      return;
    }
    if (!imageUrl) {
      throw new Error("Failed to generate image URL");
    }
    await updateUserProfileService(req.user.id, { profileImage: imageUrl });

    res.status(200).json({
      success: true,
      message: "Profile picture updated!",
      imageUrl,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteProfileImage = async (req: Request, res: Response) => {
  try {
    if (!req.user) throw new Error("User not authenticated.");
    await deleteUserProfileService(req.user?.id);
    res.status(200).json({
      success: true,
      message: "Profile picture deleted successfully.",
    });
  } catch (error: any) {
    console.error("Deletion error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete profile picture",
    });
  }
};

export const deleteUserAccount = async (req: Request, res: Response) => {
  try {
    const { password } = req.body as {password: string};
    const userId = req.user?.id;
    
    if (!userId) {
      return;
    }

    if (!verifyPassword(userId, password)) {
      res.status(403).json({
        success: false,
        message: "Invalid password confirmation",
      });
    return;
    }

    await deleteUserAccountService(userId);

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.status(200).json({
      success: true,
      message: "Account deleted successfully. You can sign up again anytime.",
    });
  } catch (error: any) {
    console.error("Account deletion error:", error);

    const statusCode = error.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
};
