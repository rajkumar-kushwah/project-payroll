// import multer from "multer";
// import path from "path";

// // Multer storage configuration
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "uploads/");
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + "-" + file.originalname);
//   },
// });

// // File filter for images only
// const fileFilter = (req, file, cb) => {
//   if (
//     file.mimetype === "image/jpeg" ||
//     file.mimetype === "image/png" ||
//     file.mimetype === "image/jpg"
//   ) {
//     cb(null, true);
//   } else {
//     cb(new Error("Only jpeg, jpg, and png files are allowed"), false);
//   }
// };

// const uploads = multer({ storage, fileFilter });

// export default uploads;




import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "profile_uploads",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const upload = multer({ storage });

export default upload;
