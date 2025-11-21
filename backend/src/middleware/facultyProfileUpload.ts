import multer from 'multer';
import type { Request } from 'express';
import cloudinary from '../utils/cloudinary';

// Import CloudinaryStorage - it's exported as a default function
const CloudinaryStorage = require('multer-storage-cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req: Request, file: Express.Multer.File) => {
    return {
      folder: 'eduvision/facultyUserProfile',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      public_id: `${Date.now()}-${file.originalname}`,
    };
  },
});

const upload = multer({ storage });

export default upload;
