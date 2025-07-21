import fs from "fs";
import path from "path";

export const ensureUploadsDirExists = (): string => {
    const uploadPath = path.join(__dirname, '../../uploads');
    if (fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, {recursive: true})
    }
    return uploadPath;
}