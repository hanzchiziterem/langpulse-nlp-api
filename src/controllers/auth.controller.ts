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
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error });
  }
};

