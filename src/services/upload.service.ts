import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

export const uploadImage = async (filePath: string): Promise<string> => {
  const result = await cloudinary.uploader.upload(filePath);
  fs.unlinkSync(filePath);
  return result.secure_url;
};