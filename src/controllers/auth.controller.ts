import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { refreshAccessToken } from "../services/auth.service";
import prisma from "../client/prisma";
import { signinSchema, signupSchema } from "../schemas/auth.schema";
import { signinUser, signupUser, signoutUser } from "../services/auth.service";
import { transporter } from "../lib/mailer";
import { generateOTP, verifyOTP } from "../utils/otp";
import { hashPassowrd } from "../lib/hash-password";

export const signupHandler = async (req: Request, res: Response) => {
  const valid = signupSchema.safeParse(req.body);
  if (!valid.success) {
    res.status(400).json(valid.error.format());
    return;
  }
  try {
    const result = await signupUser(
      valid.data.name,
      valid.data.email,
      valid.data.password
    );
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const signinHandler = async (req: Request, res: Response) => {
  const valid = signinSchema.safeParse(req.body);

  if (!valid.success) {
    res.status(400).json(valid.error.format());
    return;
  }

  try {
    const { accessToken, refreshToken } = await signinUser(
      valid.data.email,
      valid.data.password
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      success: true,
      message: "User has signed in successfully.",
      accessToken,
    });
    return;
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: (err as Error).message });
    return;
  }
};

export const refreshTokenHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const token: string | undefined = req.cookies?.refreshToken;

  if (!token) {
    res.status(401).json({ message: "No refresh token provided" });
    return;
  }

  try {
    const { newAccessToken, newRefreshToken } = await refreshAccessToken(token);

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully.",
      accessToken: newAccessToken,
    });
  } catch (err) {
    console.error(err);
    res
      .status(403)
      .json({ success: false, message: (err as Error).message || "Forbidden" });
  }
};

export const signoutHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const refreshToken: string | undefined = req.cookies?.refreshToken;

  if (!refreshToken) {
    res
      .status(400)
      .json({ success: false, message: "No refresh token provided." });
    return;
  }

  try {
    await signoutUser(refreshToken);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res
      .status(200)
      .json({ success: true, message: "Signed out successfully." });
    return;
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: (error as Error).message });
    return;
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { code } = req.query;

  if (!code) {
    res.status(400).json({ success: false, message: "Code is required." });
    return;
  }

  const cleanCode = Array.isArray(code) ? code[0] : (code as string);

  const user = await prisma.user.findFirst({
    where: { verificationCode: cleanCode },
  });

  if (!user) {
    res.status(400).json({ success: false, message: "Invalid code." });
    return;
  }

  const isValid = verifyOTP(user.verificationCodeValidation);
  if (!isValid) {
    res.status(400).json({ success: false, message: "Code expired." });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verified: true,
      verificationCode: null,
      verificationCodeValidation: null,
    },
  });

  res.status(200).json({ success: true, message: "Email has been verified!" });
};

export const resendVerification = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email } = req.body;
  //Remeber to add check if this is a valid email
  //then check if email exists

  if (!email) {
    res.status(400).json({ success: false, message: "Email is required." });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    res.status(400).json({ success: false, message: "User not found." });
    return;
  }

  if (user.verified) {
    res.status(400).json({ success: false, message: "User already verified." });
    return;
  }

  const newCode = generateOTP();
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationCode: newCode,
      verificationCodeValidation: expires,
    },
  });

  await transporter.sendMail({
    to: email,
    subject: "New verification code",
    html: `<p>Your new verification code is: <b>${newCode}</b>. It expires in 10 minutes.</p>`,
  });

  res.status(200).json({ success: true, message: "A new code has been sent." });
};

export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ success: false, message: "Email is required." });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(404).json({ success: false, message: "User not found." });
    return;
  }

  const code = generateOTP();
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      forgotPasswordCode: code,
      forgotPasswordCodeValidation: expires,
    },
  });

  await transporter.sendMail({
    to: email,
    subject: "Reset your password",
    html: `<p>Here’s your reset code: <b>${code}</b></p>`,
  });

  res.json({ success: true, message: "Reset code sent to your email." });
};

export const resendForgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ success: false, message: "Email is required." });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    res.status(404).json({ success: false, message: "User not found." });
    return;
  }

  const newCode = generateOTP();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

  await prisma.user.update({
    where: { id: user.id },
    data: {
      forgotPasswordCode: newCode,
      forgotPasswordCodeValidation: expires,
    },
  });

  await transporter.sendMail({
    to: email,
    subject: "Your new password reset code",
    html: `<p>Your new reset code is: <b>${newCode}</b>. It expires in 10 minutes.</p>`,
  });

  res.json({
    success: true,
    message: "New reset code sent to your email.",
  });
};

export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { code, newPassword } = req.body;

  if (!code || !newPassword) {
    res
      .status(400)
      .json({ success: false, message: "Code and new password are required." });
    return;
  }

  const user = await prisma.user.findFirst({
    where: { forgotPasswordCode: code },
  });

  if (!user) {
    res.status(400).json({ success: false, message: "Invalid reset code." });
    return;
  }

  if (
    user.forgotPasswordCodeValidation &&
    user.forgotPasswordCodeValidation < new Date()
  ) {
    res.status(400).json({ success: false, message: "Reset code expired." });

    return;
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      forgotPasswordCode: null,
      forgotPasswordCodeValidation: null,
    },
  });

  res.json({
    success: true,
    message: "Password has been reset successfully.",
  });
};

export const changePassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId: string = (req as any).user.id;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    res.status(400).json({
      success: false,
      message: "Both old and new passwords are required.",
    });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ success: false, message: "User not found." });
    return;
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    res
      .status(400)
      .json({ success: false, message: "Old password is incorrect." });
    return;
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  res.json({ success: true, message: "Password changed successfully." });
};
