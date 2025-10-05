import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import UserModel from '../models/User';

const router = express.Router();

// Test endpoint to verify API is working
router.get('/test', (req: any, res: any) => {
  res.json({ 
    success: true, 
    message: 'Face routes API is working',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check what data is being received
router.post('/debug', (req: any, res: any) => {
  console.log('🔍 DEBUG ENDPOINT - Request body:', req.body);
  console.log('🔍 DEBUG ENDPOINT - Request headers:', req.headers);
  console.log('🔍 DEBUG ENDPOINT - Content-Type:', req.get('Content-Type'));
  res.json({ 
    message: 'Debug endpoint received data', 
    body: req.body,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Check if user folder exists
router.get('/check-folder/:userId', async (req: any, res: any): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = await UserModel.findById(userId);
    
    if (!user) {
      res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
      return;
    }
    
    const fullName = `${user.first_name}_${user.last_name}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const userFolderPath = path.join(__dirname, '../../../streaming-server/faces', fullName);
    const folderExists = fs.existsSync(userFolderPath);
    
    let files: string[] = [];
    if (folderExists) {
      files = fs.readdirSync(userFolderPath);
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: `${user.first_name} ${user.last_name}`,
        folderName: fullName
      },
      folderPath: userFolderPath,
      folderExists: folderExists,
      files: files,
      fileCount: files.length
    });
    
  } catch (error) {
    console.error('Check folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking folder',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Configure multer for face image uploads to streaming-server/faces
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // For now, use a temporary folder and move files later in the route handler
      // This avoids the issue with req.body not being parsed in destination function
      const tempPath = path.join(__dirname, '../../../streaming-server/faces', 'temp');
      
      if (!fs.existsSync(tempPath)) {
        fs.mkdirSync(tempPath, { recursive: true });
        console.log('📁 Using temp folder for initial upload:', tempPath);
      }
      
      cb(null, tempPath);
    } catch (error) {
      cb(error instanceof Error ? error : new Error('Unknown error'), '');
    }
  },
  filename: (req, file, cb) => {
    const step = req.body.step || 'unknown';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const filename = `img${timestamp}_${randomId}.jpg`;
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Multiple photos upload for continuous capture
const uploadMultiple = multer({
  storage: storage, // Uses the same storage configuration with user names
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 10 // Maximum 10 files per request
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Face registration endpoint
router.post('/register', upload.single('image'), async (req, res): Promise<void> => {
  try {
    const { userId } = req.body;
    const file = req.file;

    if (!userId) {
      res.status(400).json({ 
        success: false, 
        message: 'User ID is required' 
      });
      return;
    }

    if (!file) {
      res.status(400).json({ 
        success: false, 
        message: 'Image file is required' 
      });
      return;
    }

    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
      return;
    }

    // Save face image path to user record using findByIdAndUpdate to bypass validation
    const faceImagePath = file.path;
    await UserModel.findByIdAndUpdate(
      userId,
      { faceImagePath: faceImagePath },
      { 
        runValidators: false, // Bypass validation to avoid course field issues
        new: true 
      }
    );

    const userName = `${user.first_name} ${user.last_name}`;
    console.log(`Face image saved for user ${userName} (${userId})`);

    // TODO: Here you would typically:
    // 1. Process the image for face recognition
    // 2. Extract face encodings
    // 3. Save encodings to face recognition system
    // 4. Update face recognition database

    res.status(200).json({
      success: true,
      message: `Face registered successfully for ${userName}`,
      faceImagePath: faceImagePath,
      userId: userId,
      userName: userName
    });

  } catch (error) {
    console.error('Face registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Multiple photos upload endpoint for continuous capture
router.post('/register-multiple', uploadMultiple.array('images', 10), async (req, res): Promise<void> => {
  try {
    const { userId, step, userName } = req.body;
    const files = req.files as Express.Multer.File[];

    console.log('🔍 REGISTER-MULTIPLE REQUEST:');
    console.log('🔍 User ID:', userId);
    console.log('🔍 User Name:', userName);
    console.log('🔍 Step:', step);
    console.log('🔍 Files count:', files?.length);

    if (!userId) {
      res.status(400).json({ 
        success: false, 
        message: 'User ID is required' 
      });
      return;
    }

    if (!files || files.length === 0) {
      res.status(400).json({ 
        success: false, 
        message: 'At least one image file is required' 
      });
      return;
    }

    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
      return;
    }

    // Determine the correct folder name
    let folderName: string;
    if (userName && userName !== 'Unknown_User' && userName !== 'undefined' && userName !== 'null') {
      folderName = userName.replace(/[^a-zA-Z0-9_-]/g, '_');
      console.log('✅ Using frontend user name for folder:', folderName);
    } else {
      folderName = `${user.first_name}_${user.last_name}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      console.log('✅ Using database user name for folder:', folderName);
    }

    // Create user folder if it doesn't exist
    const userFolderPath = path.join(__dirname, '../../../streaming-server/faces', folderName);
    if (!fs.existsSync(userFolderPath)) {
      fs.mkdirSync(userFolderPath, { recursive: true });
      console.log('📁 CREATED USER FOLDER:', userFolderPath);
    } else {
      console.log('📁 USING EXISTING USER FOLDER:', userFolderPath);
    }

    // Move files from temp folder to user folder
    const savedFiles = [];
    for (const file of files) {
      const tempPath = file.path;
      const newFileName = file.filename;
      const newPath = path.join(userFolderPath, newFileName);
      
      // Move file from temp to user folder
      fs.renameSync(tempPath, newPath);
      
      savedFiles.push({
        filename: newFileName,
        path: newPath,
        size: file.size
      });
      
      console.log(`📁 MOVED FILE: ${tempPath} -> ${newPath}`);
    }

    // Update user record with face images info using findByIdAndUpdate to bypass validation
    const newFaceImages = savedFiles.map(file => ({
      step: step || 'unknown',
      filename: file.filename,
      path: file.path,
      uploadedAt: new Date()
    }));

    await UserModel.findByIdAndUpdate(
      userId,
      { 
        $push: { 
          faceImages: { $each: newFaceImages } 
        } 
      },
      { 
        runValidators: false, // Bypass validation to avoid course field issues
        new: true 
      }
    );

    const userDisplayName = `${user.first_name} ${user.last_name}`;
    console.log(`Saved ${savedFiles.length} face images for user ${userDisplayName} (${userId}) in step ${step}`);
    console.log(`📁 Files saved to folder: ${folderName}`);

    res.status(200).json({
      success: true,
      message: `${savedFiles.length} face images saved successfully for ${userDisplayName}`,
      savedFiles: savedFiles,
      userId: userId,
      userName: userDisplayName,
      folderName: folderName,
      step: step
    });

  } catch (error) {
    console.error('Multiple face registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get face registration status
router.get('/status/:userId', async (req, res): Promise<void> => {
  try {
    const { userId } = req.params;
    
    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
      return;
    }

    const hasFaceRegistered = !!user.faceImagePath;

    res.status(200).json({
      success: true,
      hasFaceRegistered,
      faceImagePath: user.faceImagePath || null
    });

  } catch (error) {
    console.error('Face status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete face registration
router.delete('/delete/:userId', async (req, res): Promise<void> => {
  try {
    const { userId } = req.params;
    
    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
      return;
    }

    // Delete the face image file if it exists
    if (user.faceImagePath && fs.existsSync(user.faceImagePath)) {
      fs.unlinkSync(user.faceImagePath);
    }

    // Remove face image path from user record
    user.faceImagePath = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Face registration deleted successfully'
    });

  } catch (error) {
    console.error('Face deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Cleanup Unknown_User folder endpoint
router.delete('/cleanup-unknown-user', async (req, res): Promise<void> => {
  try {
    const unknownUserPath = path.join(__dirname, '../../../streaming-server/faces', 'Unknown_User');
    
    if (!fs.existsSync(unknownUserPath)) {
      res.status(404).json({
        success: false,
        message: 'Unknown_User folder not found'
      });
      return;
    }

    // Get list of files before deletion
    const files = fs.readdirSync(unknownUserPath);
    const fileCount = files.length;
    
    // Delete all files
    files.forEach(file => {
      const filePath = path.join(unknownUserPath, file);
      fs.unlinkSync(filePath);
    });
    
    // Remove the empty folder
    fs.rmdirSync(unknownUserPath);
    
    console.log(`🧹 Cleaned up Unknown_User folder: ${fileCount} files deleted`);
    
    res.status(200).json({
      success: true,
      message: `Unknown_User folder cleaned up successfully. ${fileCount} files deleted.`,
      deletedFiles: fileCount
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Debug endpoint to check folder structure
router.get('/debug-folders', async (req, res): Promise<void> => {
  try {
    const facesPath = path.join(__dirname, '../../../streaming-server/faces');
    
    if (!fs.existsSync(facesPath)) {
      res.status(404).json({
        success: false,
        message: 'Faces directory not found'
      });
      return;
    }

    const folders = fs.readdirSync(facesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => {
        const folderPath = path.join(facesPath, dirent.name);
        const files = fs.readdirSync(folderPath);
        return {
          name: dirent.name,
          fileCount: files.length,
          files: files.slice(0, 5) // Show first 5 files
        };
      });

    res.status(200).json({
      success: true,
      message: 'Folder structure retrieved',
      facesPath: facesPath,
      folders: folders
    });

  } catch (error) {
    console.error('Debug folders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

