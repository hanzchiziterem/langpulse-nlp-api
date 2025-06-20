import express from 'express';
import dotenv from 'dotenv';
import cors from "cors";
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import OpenAI from "openai";

//Routes
import v1Routes from './routes/v1';


//Configutations
dotenv.config();
const app = express();
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const swaggerDocument = YAML.load('./swagger.yaml');

//Middlewares
app.use(express.json())
app.use(cors())

//Routes
app.use('/api/v1', v1Routes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

export default app;