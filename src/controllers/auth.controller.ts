import { Request, Response } from "express";
import { signinSchema, signupSchema } from "../schemas/auth.schema";
import { signinUser, signupUser } from "../services/auth.service";

export const signupHandler = async (req: Request, res: Response) => {
  const valid = signupSchema.safeParse(req.body);
  if (!valid.success) {
    res.status(400).json(valid.error.format());
    return;
  }
  try {
    const result = await signupUser({
      name: valid.data.name,
      email: valid.data.email,
      password: valid.data.password,
    });

    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error });
  }
};

export const signinHandler = async (req: Request, res: Response) => {
  const valid = signinSchema.safeParse(req.body);
  if (!valid.success) {
    res.status(400).json(valid.error.format());
    return;
  }

  try {
    const result = await signinUser({
      email: valid.data.email,
      password: valid.data.password,
    });

    const token = result.token;
        res
      .cookie("authorization", token, {
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict", 
        maxAge:  7 * 24 * 60 * 60 * 1000, // 7 days.
      })
      .status(200)
      .json({ success:true, message: "Sign in successful!", token: token }); 
  } catch (error) {
    res.status(401).json({ error: error });
  }
};

export const signoutHandler = async (req: Request, res: Response): Promise<void> => {
  res
    .clearCookie("authorization", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    })
    .status(200)
    .json({ success:true, message: "Signed out successfully" });
};

