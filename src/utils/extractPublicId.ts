export const extractPublicId = (url: string): string => {
  const publicId = url?.split("/").pop()?.split(".")[0];
  if (!publicId) throw new Error("Invalid Cloudinary URL");
  return publicId;
};
