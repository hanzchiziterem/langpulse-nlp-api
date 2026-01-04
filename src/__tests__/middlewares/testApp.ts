import express, {Request, Response, NextFunction} from "express";
import { strictLimiter } from "@/middlewares/rateLimiter.middleware";

export const createTestApp = () => {
    const app = express();

    app.use((req: Request, _res: Response, next: NextFunction) =>{
        req.user = {
            id: 'user-123'
        }
        next();
    })

    app.post('/test', strictLimiter, (_req, res) => {
        res.status(200).json({success: true})
    })

    return app;
}