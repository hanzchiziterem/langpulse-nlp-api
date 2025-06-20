import {z} from 'zod';

export const inputSchema = z.object({
  text: z.string().min(1, 'Text is required'),
});

