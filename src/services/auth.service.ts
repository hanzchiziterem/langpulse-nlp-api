import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { User } from "../generated/prisma";

interface SignUpUser {
  name: string;
  email: string;
  password: string;
}

interface SignInUser {
  email: string;
  password: string;
}

const JWT_SECRET = process.env.JWT_SECRET;

export const signupUser = async ({
  name,
  email,
  password,
}: SignUpUser): Promise<{ success: boolean; message: string }> => {
  const existing: User | null = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) throw new Error("User already exists");

  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: { name, email, password: hashed },
  });
  return { success: true, message: "User signup is successful." };
};

export const signinUser = async ({
  email,
  password,
}: SignInUser): Promise<{
  success: boolean;
  message: string;
  token: string;
}> => {
  const user: User | null = await prisma.user.findUnique({ where: { email } });
  if (user === null) throw new Error("user must not be null.");
  if (!user) throw new Error("Invalid credentials");
  const match: boolean = await bcrypt.compare(password, user.password);

  if (!match) throw new Error("Invalid credentials");
  if (!JWT_SECRET) throw new Error("JWT_SECRET not set");

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });
  return { success: true, message: "User sigin successful", token };
};
