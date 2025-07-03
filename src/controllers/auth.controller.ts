import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { signinSchema, signupSchema } from "../schemas/auth.schema";
import { signinUser, signupUser } from "../services/auth.service";
import prisma from "../client/prisma";
import { transporter } from "../lib/mailer";
import { generateOTP, verifyOTP } from "../utils/otp";

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
    const result = await signinUser(valid.data.email, valid.data.password);
    res
      .status(200)
      .json({
        success: true,
        message: "User has sigined in successfully.",
        data: result,
      });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

export const signoutHandler = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(400).json({ success: false, message: "No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.decode(token) as any;

    if (!decoded || !decoded.exp) {
      return res.status(400).json({ success: false, message: "Invalid token." });
    }

    const expiresAt = new Date(decoded.exp * 1000);

    await prisma.blacklistedToken.create({
      data: {
        token,
        expiresAt,
      },
    });

    return res.status(200).json({ success: true, message: "Signed out successfully." });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Something went wrong." });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code) {
    return res
      .status(400)
      .json({ success: false, message: "Code is required." });
  }

  const cleanCode = Array.isArray(code) ? code[0] : (code as string);

  const user = await prisma.user.findFirst({
    where: { verificationCode: cleanCode },
  });

  if (!user) {
    return res.status(400).json({ success: false, message: "Invalid code." });
  }

  const isValid = verifyOTP(user.verificationCodeValidation);
  if (!isValid) {
    return res.status(400).json({ success: false, message: "Code expired." });
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

export const resendVerification = async (req: Request, res: Response) => {
  const { email } = req.body;
  //Remeber to add check if this is a valid email
  //then check if email exists

  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: "Email is required." });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.status(400).json({ success: false, message: "User not found." });
  }

  if (user.verified) {
    return res
      .status(400)
      .json({ success: false, message: "User already verified." });
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

