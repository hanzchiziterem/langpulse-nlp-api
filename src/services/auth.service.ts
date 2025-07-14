import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../client/prisma";
import { hashPassowrd } from "../lib/hash-password";
import { transporter } from "../lib/mailer";
import { generateOTP } from "../utils/otp";
import { RefreshTokenPayload } from "../interfaces/auth.interface";

const JWT_TOKEN_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_TOKEN_SECRET!;

export const signupUser = async (
  name: string,
  email: string,
  password: string
) => {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    throw new Error("User already exists");
  }

  const hashedPassowrd = await hashPassowrd(password, 10);

  const newUser = await prisma.user.create({
    data: { name, email, password: hashedPassowrd },
  });

  const code = generateOTP();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // expires in 10 mins

  await prisma.user.update({
    where: { id: newUser.id },
    data: {
      verificationCode: code,
      verificationCodeValidation: expires,
    },
  });

  await transporter.sendMail({
    to: email,
    subject: "Verify your Email.",
    html: `<p>Your verification code is: <b>${code}</b></p>`,
  });

  return {
    success: true,
    message: "User created, Check your email for a verification code.",
  };
};

export const signinUser = async (
  email: string,
  password: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Invalid credentials");

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error("Invalid credentials");

  const accessToken = jwt.sign(
    { id: user.id, email: user.email },
    JWT_TOKEN_SECRET!,
    { expiresIn: "1h" }
  );

  const refreshToken = jwt.sign(
    { id: user.id, email: user.email },
    JWT_REFRESH_TOKEN_SECRET!,
    { expiresIn: "7d" }
  );

  const hashedRefresh = await bcrypt.hash(refreshToken, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: hashedRefresh },
  });

  return { accessToken, refreshToken };
};

export const refreshAccessToken = async (
  incomingToken: string
): Promise<{ newAccessToken: string; newRefreshToken: string }> => {
    const payload = jwt.verify(
      incomingToken,
      process.env.JWT_REFRESH_TOKEN_SECRET!
    ) as RefreshTokenPayload;

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user || !user.refreshToken) {
      throw new Error("No valid user or refresh token");
    }

    const isValid = await bcrypt.compare(incomingToken, user.refreshToken);
    if (!isValid) {
      throw new Error("Invalid refresh token");
    }

    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_TOKEN_SECRET!,
      { expiresIn: "1h" }
    );

    const newRefreshToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_REFRESH_TOKEN_SECRET!,
      { expiresIn: "7d" }
    );

    const hashedNewRefresh = await bcrypt.hash(newRefreshToken, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedNewRefresh },
    });

    return { newAccessToken, newRefreshToken };
};

export const signoutUser = async (refreshToken: string): Promise<void> => {
  const payload = jwt.verify(
    refreshToken,
    process.env.JWT_REFRESH_TOKEN_SECRET!
  ) as RefreshTokenPayload;

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
  });

  if (!user || !user.refreshToken) {
    throw new Error("User not found or already signed out.");
  }

  const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
  if (!isValid) {
    throw new Error("Invalid refresh token.");
  }

  await prisma.user.update({
    where: { id: payload.id },
    data: { refreshToken: null },
  });
};
