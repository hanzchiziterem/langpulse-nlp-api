import express, {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from "express";
import { strictLimiter } from "@/middlewares/rateLimiter.middleware";
import { upload } from "@/middlewares/upload.middleware";
import { securityContextMiddleware } from "@/middlewares/security.middleware";
import v1Routes from "@/routes/v1";

const userAlreadyExists = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  req.user = {
    id: "user-123",
  };
  next();
};

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

export const createTestApp = () => {
  const app = express();

  app.use(express.json());
  app.use("/api/v1", v1Routes);
  app.use(userAlreadyExists);
  app.use(securityContextMiddleware);

  app.post("/test", strictLimiter, (_req, res) => {
    res.status(200).json({ success: true });
  });

  app.post("/upload", upload, (_req, res) => {
    res.status(200).json({ success: true });
  });
  app.use(errorHandler);

  return app;
};
