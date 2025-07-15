import { Request, Response } from "express";
import { getUserProfileService, deleteUserAnalysisService, getUserAnalysisHistoryService, } from "../services/user.service";
export const getUserProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const profile = await getUserProfileService(req.user?.id!);
    res.json({ success: true, data: profile });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Oops! Profile broken." });
  }
};

export const getAnalysisHistory = async (req:Request, res:Response): Promise<void> => {
    try {
        const history = await getUserAnalysisHistoryService(req.user?.id!);
            res.json({ success: true, data: history });
    } catch (error) {
    res.status(500).json({ success: false, message: "No analysis history found!" });
  
    }
}

export const deleteAnalysis = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      return;
    }
    await deleteUserAnalysisService(req.user.id, req.params.id);
    res.json({ success: true, message: "Poof! It's gone! ✨" });
  } catch (error) {
    res.status(400).json({ success: false, message: "Couldn't analysis history delete." });
  }
};