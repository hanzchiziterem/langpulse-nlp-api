import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../client/prisma";
import { hashPassowrd } from "../lib/hash-password";
import { transporter } from "../lib/mailer";
import { generateOTP } from "../utils/otp";

const JWT_SECRET = process.env.JWT_SECRET;

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
    where:{id: newUser.id},
      data: {
      verificationCode: code,
      verificationCodeValidation: expires,
    },
  });

  await transporter.sendMail({
    to: email,
    subject: "Verify your Email.",
    html: `<p>Your verification code is: <b>${code}</b></p>`
  });
  
  return { success: true, message: "User created, Check your email for a verification code." };
};

export const signinUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Invalid credentials");
  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error("Invalid credentials");
  if (!JWT_SECRET) {
    return;
  }
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "1h",
  });
  return { token };
};
