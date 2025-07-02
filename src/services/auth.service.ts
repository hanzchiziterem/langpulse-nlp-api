import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { users, User } from "../models/user.model";

const JWT_SECRET = process.env.JWT_SECRET;

//Use Arrays implement Prisma and PostgreSQL later.
//Test with postman after.

export const signupUser = async (name: string, email: string, password: string) => {
  const existing = users.find((user) => user.email === email);
  if (existing) throw new Error("User already exists");

  const hashed = await bcrypt.hash(password, 10);
  const newUser: User = {
    id: Date.now(),
    name,
    email,
    password: hashed,
  };
  users.push(newUser);
  return { message: "User registered successfully." };
};

export const signinUser = async (email: string, password: string) => {
  const user = users.find((u) => u.email === email);
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
