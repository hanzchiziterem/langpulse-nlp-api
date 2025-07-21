import { Request } from "express";

export interface AuthRequest extends Request {
  user: {
    id: string;
  };
}
export interface AuthBodyRequest<T> extends Request {
  body: T;
  user: {
    id: string;
  };
}
