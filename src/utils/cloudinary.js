import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async function (localFilePath) {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log(response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    return null;
  }
};

const deleteFromCloudinary = async function (oldUrl) {
  try {
    if (!oldUrl) {
      return null;
    }

    await cloudinary.uploader.destroy(oldUrl);
  } catch (error) {
    throw error;
  }
};

// cloudinary.uploader.destroy('sample', function(result) { console.log(result) });

export { uploadOnCloudinary, deleteFromCloudinary };
