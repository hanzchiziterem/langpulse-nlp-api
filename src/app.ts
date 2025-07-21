import express from 'express';
import dotenv from 'dotenv';
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import OpenAI from "openai";

import { securityContextMiddleware } from './middlewares/security.middleware';
import { ensureUploadsDirExists } from './utils/cloudinary/fileHelper';

//Routes
import v1Routes from './routes/v1';

//Configutations
dotenv.config();
ensureUploadsDirExists();
const app = express();
app.set('trust proxy', 1);

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const swaggerDocument = YAML.load('./swagger.yaml');

//Middlewares
app.use(express.json())
app.use(cors())
app.use(cookieParser());

app.use(securityContextMiddleware);

//Routes
app.use('/api/v1', v1Routes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

export default app;