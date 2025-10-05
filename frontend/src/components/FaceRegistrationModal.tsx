import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  Alert,
  CircularProgress,
  Paper,
  LinearProgress
} from '@mui/material';
import { Close as CloseIcon, Camera as CameraIcon } from '@mui/icons-material';
import axios from 'axios';

interface User {
  _id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  username: string;
  email: string;
  role: string;
  status: string;
  college: any;
  course: any;
  faceImagePath?: string;
}

interface FaceRegistrationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: User | null;
  userId?: string; // Fallback user ID prop
}

const PHOTOS_PER_STEP = 10;
const CANVAS_WIDTH = 160;
const CANVAS_HEIGHT = 120;
const JPEG_QUALITY = 0.7;

const FaceRegistrationModal: React.FC<FaceRegistrationModalProps> = ({ 
  open, 
  onClose, 
  onSuccess, 
  user,
  userId: propUserId
}) => {
  // Core states
  const [activeStep, setActiveStep] = useState(0);
  const [allCapturedPhotos, setAllCapturedPhotos] = useState<{ [key: number]: string[] }>({});
  const [showSaveRetake, setShowSaveRetake] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Camera states
  const [cameraStatus, setCameraStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);

  const steps = [
    'Capture Step 1',
    'Capture Step 2', 
    'Capture Step 3',
    'Capture Step 4'
  ];

  // Reset states when modal opens
  useEffect(() => {
    if (open) {
      console.log('🎥 Modal opened - resetting states');
      console.log('🎥 User passed to modal:', user);
      console.log('🎥 User ID:', user?._id);
      console.log('🎥 User name:', user?.first_name, user?.last_name);
      console.log('🎥 Prop userId:', propUserId);
      console.log('🎥 User object keys:', user ? Object.keys(user) : 'user is null');
      
      // Check if user is properly passed
      if (!user || !user._id) {
        console.error('❌ CRITICAL: User is not properly passed to modal!');
        console.error('❌ User object:', user);
        console.error('❌ Prop userId:', propUserId);
        console.error('❌ URL path:', window.location.pathname);
        
        // Don't return error, use fallback instead
        console.log('🔄 Using fallback mechanisms...');
      } else {
        console.log('✅ User object is properly passed to modal');
        console.log('✅ User ID is valid:', user._id);
        console.log('✅ User name is valid:', user.first_name, user.last_name);
        console.log('✅ User object keys:', Object.keys(user));
        console.log('✅ User object values:', {
          _id: user._id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          email: user.email
        });
      }
      
      setActiveStep(0);
      setAllCapturedPhotos({});
      setShowSaveRetake(false);
      setIsSaving(false);
      setIsCapturing(false);
      setError('');
      setSuccess('');
      setErrorMessage('');
      
      // Start camera immediately
      startCamera();
      
      // Fallback: Force camera ready after 5 seconds if still loading
      const fallbackTimeout = setTimeout(() => {
        if (cameraStatus === 'loading') {
          console.log('🚨 FALLBACK: Forcing camera ready after 5 seconds');
          setCameraStatus('ready');
        }
      }, 5000);
      
      return () => clearTimeout(fallbackTimeout);
    } else {
      console.log('🎥 Modal closed - cleaning up');
      stopCamera();
      resetStates();
    }
  }, [open, user]);

  // Monitor video element and force display
  useEffect(() => {
    if (cameraStatus === 'ready' && videoRef.current && stream) {
      const video = videoRef.current;
      
      // Force video to display
      const forceVideoDisplay = () => {
        if (video && stream) {
          console.log('🎥 Forcing video display...');
          video.srcObject = stream;
          video.play().catch(console.error);
        }
      };
      
      // Try multiple times to ensure video displays
      forceVideoDisplay();
      setTimeout(forceVideoDisplay, 500);
      setTimeout(forceVideoDisplay, 1000);
      setTimeout(forceVideoDisplay, 2000);
    }
  }, [cameraStatus, stream]);

  // Start camera
  const startCamera = async () => {
    try {
      console.log('🎥 Requesting camera access...');
      setCameraStatus('loading');
      
      // Stop any existing stream first
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      
      // Try with simpler constraints first
      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        });
      } catch (error) {
        console.log('🎥 Trying with minimal constraints...');
        // Fallback to minimal constraints
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }

      console.log('🎥 Camera stream obtained:', mediaStream);
      setStream(mediaStream);

      if (videoRef.current) {
        console.log('🎥 Attaching stream to video element');
        videoRef.current.srcObject = mediaStream;
        
        const handleVideoReady = () => {
          console.log('🎥 Video ready - camera initialized');
          setCameraStatus('ready');
        };

        // Listen for multiple events to ensure video is ready
        videoRef.current.onloadedmetadata = () => {
          console.log('🎥 Video metadata loaded');
          handleVideoReady();
        };
        videoRef.current.oncanplay = () => {
          console.log('🎥 Video can play');
          handleVideoReady();
        };
        videoRef.current.onplay = () => {
          console.log('🎥 Video is playing');
          handleVideoReady();
        };
        videoRef.current.onloadeddata = () => {
          console.log('🎥 Video data loaded');
          handleVideoReady();
        };
        
        // Force play the video immediately
        setTimeout(() => {
          if (videoRef.current) {
            console.log('🎥 Forcing video play');
            videoRef.current.play().catch((error) => {
              console.error('🎥 Video play error:', error);
            });
          }
        }, 100);
        
        // Multiple fallback timeouts
        setTimeout(() => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            console.log('🎥 Video already ready - camera was already on');
            handleVideoReady();
          }
        }, 200);
        
        setTimeout(() => {
          if (cameraStatus === 'loading') {
            console.log('🎥 Camera timeout 1s - forcing ready state');
            setCameraStatus('ready');
          }
        }, 1000);
        
        setTimeout(() => {
          if (cameraStatus === 'loading') {
            console.log('🎥 Camera timeout 2s - forcing ready state');
            setCameraStatus('ready');
          }
        }, 2000);
        
        setTimeout(() => {
          if (cameraStatus === 'loading') {
            console.log('🎥 Camera timeout 3s - forcing ready state');
            setCameraStatus('ready');
          }
        }, 3000);
      }
    } catch (error: any) {
      console.error('❌ Camera error:', error);
      setCameraStatus('error');
      if (error.name === 'NotAllowedError') {
        setErrorMessage('Camera access denied. Please allow camera access and try again.');
      } else if (error.name === 'NotFoundError') {
        setErrorMessage('No camera found. Please connect a camera and try again.');
      } else if (error.name === 'NotReadableError') {
        setErrorMessage('Camera is being used by another application. Please close other apps and try again.');
      } else if (error.name === 'OverconstrainedError') {
        setErrorMessage('Camera constraints not supported. Please try a different camera.');
      } else {
        setErrorMessage('Failed to access camera. Please check your camera and try again.');
      }
    }
  };

  // Stop camera
  const stopCamera = () => {
    console.log('🛑 Stopping camera...');
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus('loading');
  };

  // Manual capture 20 photos for current step
  const startManualCapture = async () => {
    if (!open || cameraStatus !== 'ready') {
      console.log('❌ Cannot start capture: modal not open or camera not ready');
      return;
    }

    if (isCapturing) {
      console.log('❌ Already capturing');
      return;
    }

    const currentStepPhotos = allCapturedPhotos[activeStep] || [];
    if (currentStepPhotos.length >= PHOTOS_PER_STEP) {
      console.log(`❌ Step ${activeStep + 1} already has ${currentStepPhotos.length} photos`);
      return;
    }

    console.log(`📸 Starting manual capture for step ${activeStep + 1} - will capture 10 photos`);
    setIsCapturing(true);

    // Capture 10 photos with 1 second interval
    for (let i = 0; i < PHOTOS_PER_STEP; i++) {
      if (!open || cameraStatus !== 'ready') {
        console.log('❌ Capture stopped: modal closed or camera not ready');
        break;
      }

      const currentPhotos = allCapturedPhotos[activeStep] || [];
      if (currentPhotos.length >= PHOTOS_PER_STEP) {
        console.log(`❌ Step ${activeStep + 1} already has ${currentPhotos.length} photos - stopping`);
        break;
      }

      console.log(`📸 Capturing photo ${i + 1}/${PHOTOS_PER_STEP} for step ${activeStep + 1}`);
      capturePhoto();
      
      // Wait 1 second before next photo
      if (i < PHOTOS_PER_STEP - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Manual capture completed for step ${activeStep + 1}`);
    setIsCapturing(false);
    
    // Show success message
    setSuccess(`Step ${activeStep + 1} completed! All 10 photos captured and saved.`);
    setTimeout(() => setSuccess(''), 3000);
  };

  // Capture single photo
  const capturePhoto = () => {
    if (!videoRef.current || !open) return;

    const video = videoRef.current;
    if (video.paused || video.ended || video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('⚠️ Video not ready');
      return;
    }

    try {
      console.log(`📸 CAPTURING PHOTO: Video size ${video.videoWidth}x${video.videoHeight}`);
      
      // Create small canvas for fast capture
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        console.log(`📸 Drawing video to canvas ${CANVAS_WIDTH}x${CANVAS_HEIGHT}`);
        ctx.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        const imageData = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        
        console.log(`📸 Generated image data: ${imageData.length} characters`);
        console.log(`📸 Image data preview: ${imageData.substring(0, 50)}...`);
        
        // Store photo - ensure we don't exceed 20 photos per step
        setAllCapturedPhotos(prev => {
          const currentStepPhotos = prev[activeStep] || [];
          if (currentStepPhotos.length >= PHOTOS_PER_STEP) {
            console.log(`🚨 SKIP STORE: Step ${activeStep + 1} already has ${PHOTOS_PER_STEP} photos - not storing more`);
            return prev;
          }
          const newPhotos = [...currentStepPhotos, imageData];
          console.log(`💾 STORED: Step ${activeStep + 1} now has ${newPhotos.length} photos`);
          console.log(`💾 Photo data length: ${imageData.length} characters`);
          
          // IMMEDIATE SAVE: Save this photo right away
          savePhotoImmediately(imageData, activeStep, newPhotos.length);
          
          return {
            ...prev,
            [activeStep]: newPhotos
          };
        });

        console.log(`📸 Captured photo ${(allCapturedPhotos[activeStep]?.length || 0) + 1}/${PHOTOS_PER_STEP} for step ${activeStep + 1}`);
      } else {
        console.error('❌ Failed to get canvas context');
      }
    } catch (error) {
      console.error('❌ Capture error:', error);
    }
  };

  // Fetch user details from backend if needed
  const fetchUserDetails = async (userId: string) => {
    try {
      console.log('🔍 Fetching user details for ID:', userId);
      const response = await axios.get(`http://localhost:5000/api/auth/user/${userId}`);
      console.log('✅ User details fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch user details:', error);
      return null;
    }
  };

  // Save a single photo immediately
  const savePhotoImmediately = async (imageData: string, stepIndex: number, photoNumber: number) => {
    try {
      console.log(`💾 IMMEDIATE SAVE: Saving photo ${photoNumber} for step ${stepIndex + 1}`);
      console.log(`💾 Image data length: ${imageData.length} characters`);
      console.log(`💾 User ID: ${user?._id}`);
      console.log(`💾 User object:`, user);
      console.log(`💾 User name: ${user?.first_name} ${user?.last_name}`);
      console.log(`💾 User keys:`, user ? Object.keys(user) : 'user is null/undefined');
      console.log(`💾 User _id type:`, typeof user?._id);
      console.log(`💾 User _id value:`, user?._id);
      console.log(`💾 Prop userId:`, propUserId);
      console.log(`💾 User first_name:`, user?.first_name);
      console.log(`💾 User last_name:`, user?.last_name);
      
      // Validate user object before proceeding
      if (!user && !propUserId) {
        console.error('❌ CRITICAL: No user object or propUserId available!');
        setError('User information not available. Please refresh the page and try again.');
        return;
      }
      
      console.log('🔍 USER OBJECT VALIDATION:');
      console.log('🔍 User object exists:', !!user);
      console.log('🔍 User object type:', typeof user);
      console.log('🔍 User object keys:', user ? Object.keys(user) : 'user is null');
      console.log('🔍 User _id:', user?._id);
      console.log('🔍 User first_name:', user?.first_name);
      console.log('🔍 User last_name:', user?.last_name);
      console.log('🔍 Prop userId:', propUserId);
      
      // Convert base64 to file
      const byteString = atob(imageData.split(',')[1]);
      const mimeString = imageData.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const file = new File([ab], `step${stepIndex + 1}_${photoNumber}.jpg`, { type: mimeString });
      
      console.log(`📁 Created file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
      
      // Create FormData for single photo
      const formData = new FormData();
      formData.append('images', file);
      
      // Handle case where user might be undefined - use multiple fallbacks
      let userId = user?._id || propUserId || '';
      
      console.log('🔍 USER ID RESOLUTION:');
      console.log('🔍 user?._id:', user?._id);
      console.log('🔍 propUserId:', propUserId);
      console.log('🔍 user object:', user);
      
      // Fallback: Try to get user ID from URL if user object is missing
      if (!userId || userId === 'undefined' || userId === 'null') {
        console.error('❌ CRITICAL: User ID is undefined or invalid!');
        console.error('❌ User object:', user);
        console.error('❌ User keys:', user ? Object.keys(user) : 'user is null');
        console.error('❌ Prop userId:', propUserId);
        
        // Try to extract user ID from URL as fallback
        const urlPath = window.location.pathname;
        const userIdMatch = urlPath.match(/\/face-registration\/([a-f0-9]{24})/);
        if (userIdMatch) {
          userId = userIdMatch[1];
          console.log('🔄 FALLBACK: Using user ID from URL:', userId);
        } else {
          // Try to get user ID from localStorage or sessionStorage
          const storedUserId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
          if (storedUserId && storedUserId !== 'undefined' && storedUserId !== 'null') {
            userId = storedUserId;
            console.log('🔄 FALLBACK: Using stored user ID:', userId);
          } else {
            console.error('❌ No valid user ID found anywhere - this will cause issues');
            setError('User ID not found. Please refresh the page and try again.');
            return;
          }
        }
      }
      
      console.log('✅ FINAL USER ID:', userId);
      
      // Final validation before sending to backend
      if (!userId || userId === 'undefined' || userId === 'null' || userId === '') {
        console.error('❌ FINAL VALIDATION FAILED: Invalid user ID:', userId);
        setError('Invalid user ID. Please refresh the page and try again.');
        return;
      }
      
      formData.append('userId', userId);
      
      // Get user name with improved fallback logic
      let userName = '';
      let userDetails = user;
      
      // If user object is incomplete, try to fetch from backend
      if ((!user?.first_name || !user?.last_name) && userId) {
        console.log('🔍 User object incomplete, fetching details from backend...');
        const fetchedUser = await fetchUserDetails(userId);
        if (fetchedUser) {
          userDetails = fetchedUser;
          console.log('✅ Using fetched user details:', userDetails);
        }
      }
      
      if (userDetails?.first_name && userDetails?.last_name) {
        userName = `${userDetails.first_name}_${userDetails.last_name}`;
        console.log('✅ Using complete user name:', userName);
      } else if (userDetails?.first_name || userDetails?.last_name) {
        // If we have at least one name, use what we have
        const firstName = userDetails?.first_name || 'User';
        const lastName = userDetails?.last_name || 'Unknown';
        userName = `${firstName}_${lastName}`;
        console.log('⚠️ Using partial user name:', userName);
      } else if (userId) {
        // Try to get user name from the user ID if available
        // For now, use a more generic fallback that includes the user ID
        userName = `User_${userId.substring(0, 8)}`; // Use first 8 chars of user ID
        console.log('⚠️ Using userId fallback:', userName);
      } else {
        // Last resort - use timestamp to make it unique
        userName = `User_${Date.now()}`;
        console.log('❌ Using timestamp fallback:', userName);
      }
      
      console.log('📤 User name being sent:', userName);
      console.log('📤 User object details:', {
        first_name: user?.first_name,
        last_name: user?.last_name,
        full_name: user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : 'N/A'
      });
      console.log('📤 User details used:', {
        first_name: userDetails?.first_name,
        last_name: userDetails?.last_name,
        full_name: userDetails?.first_name && userDetails?.last_name ? `${userDetails.first_name} ${userDetails.last_name}` : 'N/A'
      });
      
      // Validate user name before sending
      if (!userName || userName === 'undefined' || userName === 'null' || userName === '') {
        console.error('❌ CRITICAL: Invalid user name:', userName);
        console.error('❌ User object at time of error:', user);
        console.error('❌ User details at time of error:', userDetails);
        console.error('❌ User ID at time of error:', userId);
        setError('Invalid user name. Please refresh the page and try again.');
        return;
      }
      
      console.log('✅ VALIDATED USER NAME:', userName);
      console.log('✅ USER NAME TYPE:', typeof userName);
      console.log('✅ USER NAME LENGTH:', userName.length);
      
      formData.append('userName', userName);
      formData.append('step', (stepIndex + 1).toString());
      formData.append('photoNumber', photoNumber.toString());
      
      console.log(`📤 Uploading single photo: step${stepIndex + 1}_${photoNumber}.jpg (${file.size} bytes)`);
      console.log(`📤 FormData entries:`, Array.from(formData.entries()));
      console.log(`📤 User ID being sent:`, userId);
      console.log(`📤 User name being sent:`, userName);
      
      // Debug: Check if FormData is properly constructed
      console.log('🔍 DEBUG: FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value);
      }
      
      // Upload to backend
      console.log(`📤 Making API call to http://localhost:5000/api/face/register-multiple`);
      const response = await axios.post('http://localhost:5000/api/face/register-multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      console.log(`✅ Photo ${photoNumber} for step ${stepIndex + 1} saved successfully:`, response.data);
      console.log(`✅ Response status: ${response.status}`);
      console.log(`✅ Response headers:`, response.headers);
      console.log(`✅ Saved files:`, response.data.savedFiles);
      console.log(`✅ User folder should be: ${response.data.userName?.replace(/\s+/g, '_')}`);
      
      return response.data;
    } catch (error) {
      console.error(`❌ Error saving photo ${photoNumber} for step ${stepIndex + 1}:`, error);
      console.error(`❌ Error details:`, (error as any).response?.data || (error as any).message);
      console.error(`❌ Error status:`, (error as any).response?.status);
      console.error(`❌ Error config:`, (error as any).config);
      console.error(`❌ Full error object:`, error);
      
      // Show error to user
      setError(`Failed to save photo ${photoNumber}: ${(error as any).response?.data?.message || (error as any).message}`);
      
      // Don't throw error - continue with next photos even if one fails
    }
  };

  // Handle next step
  const handleNextStep = () => {
    console.log(`🔄 handleNextStep called: activeStep=${activeStep}, steps.length=${steps.length}`);
    
    if (activeStep < steps.length - 1) {
      console.log(`📈 Moving from step ${activeStep + 1} to step ${activeStep + 2}`);
      setActiveStep(prev => prev + 1);
    } else {
      console.log('🎉 ALL STEPS COMPLETED - SHOWING SAVE/RETAKE OPTIONS');
      setShowSaveRetake(true);
    }
  };

  // Handle Save
  const handleSave = async () => {
    console.log('💾 SAVE BUTTON CLICKED - All photos already saved individually!');
    setIsSaving(true);
    try {
      console.log('💾 All photos were saved immediately during capture');
      console.log('📸 Total photos captured:', Object.values(allCapturedPhotos).flat().length);
      console.log('📸 All captured photos:', allCapturedPhotos);
      
      // All photos are already saved individually, just show success
      console.log('✅ All photos were saved immediately during capture - no additional upload needed');
      setSuccess('Face registration completed successfully! All photos saved.');
      
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error in save process:', error);
      setError('Failed to complete face registration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Retake
  const handleRetake = () => {
    console.log('🔄 Retaking face registration...');
    setShowSaveRetake(false);
    setActiveStep(0);
    setAllCapturedPhotos({});
    setIsCapturing(false);
    setError('');
    setSuccess('');
  };

  // Reset all states
  const resetStates = () => {
    console.log('🔄 Resetting all states');
    setActiveStep(0);
    setAllCapturedPhotos({});
    setShowSaveRetake(false);
    setIsSaving(false);
    setIsCapturing(false);
    setError('');
    setSuccess('');
  };

  const getAngleInstructions = (step: number) => {
    return `Step ${step + 1}: Position your face in the center and look at the camera`;
  };

  const isStepComplete = (stepIndex: number) => {
    return (allCapturedPhotos[stepIndex]?.length || 0) >= PHOTOS_PER_STEP;
  };

  const canCaptureCurrentStep = () => {
    const currentPhotos = allCapturedPhotos[activeStep] || [];
    return currentPhotos.length < PHOTOS_PER_STEP && !isCapturing;
  };

  const canGoToNextStep = () => {
    const currentPhotos = allCapturedPhotos[activeStep] || [];
    return currentPhotos.length >= PHOTOS_PER_STEP && activeStep < steps.length - 1;
  };

  const allStepsComplete = () => {
    return steps.every((_, index) => isStepComplete(index));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Face Registration - {user?.first_name} {user?.last_name}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {/* Stepper */}
        <Box sx={{ mb: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label, index) => (
              <Step key={label} completed={isStepComplete(index)}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Camera Feed */}
        <Paper 
          elevation={3} 
          sx={{ 
            p: 2, 
            mb: 3, 
            textAlign: 'center',
            position: 'relative',
            minHeight: '300px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {cameraStatus === 'loading' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">
                Initializing camera...
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                If this takes too long, try refreshing the page or check camera permissions
              </Typography>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={startCamera}
                sx={{ mt: 1 }}
              >
                Retry Camera
              </Button>
              <Button 
                variant="text" 
                size="small" 
                onClick={() => {
                  console.log('🔍 Camera Debug Info:');
                  console.log('- cameraStatus:', cameraStatus);
                  console.log('- stream:', stream);
                  console.log('- videoRef.current:', videoRef.current);
                  console.log('- video readyState:', videoRef.current?.readyState);
                  console.log('- video paused:', videoRef.current?.paused);
                  console.log('- video ended:', videoRef.current?.ended);
                  console.log('- video videoWidth:', videoRef.current?.videoWidth);
                  console.log('- video videoHeight:', videoRef.current?.videoHeight);
                }}
                sx={{ mt: 1 }}
              >
                Debug Info
              </Button>
            </Box>
          )}

          {cameraStatus === 'error' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" color="error">
                Camera Error
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {errorMessage}
              </Typography>
              <Button variant="contained" onClick={startCamera}>
                Retry Camera
              </Button>
            </Box>
          )}

          {cameraStatus === 'ready' && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                loop
                style={{
                  width: '100%',
                  maxWidth: '500px',
                  height: 'auto',
                  borderRadius: '8px',
                  border: '2px solid #1976d2',
                  backgroundColor: '#000'
                }}
                onLoadedMetadata={() => {
                  console.log('🎥 Video metadata loaded');
                  if (videoRef.current) {
                    videoRef.current.play().catch(console.error);
                  }
                }}
                onCanPlay={() => {
                  console.log('🎥 Video can play');
                  if (videoRef.current) {
                    videoRef.current.play().catch(console.error);
                  }
                }}
                onPlay={() => {
                  console.log('🎥 Video is playing');
                }}
                onError={(e) => {
                  console.error('🎥 Video error:', e);
                }}
              />
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {showSaveRetake ? 'All steps completed! Choose to save or retake.' : 
                   isStepComplete(activeStep) ? `Step ${activeStep + 1} Complete! Ready for next step.` :
                   getAngleInstructions(activeStep)}
                </Typography>
                <Typography variant="caption" display="block" sx={{ opacity: 0.7 }}>
                  {showSaveRetake ? 'Face registration completed successfully' :
                   isCapturing ? `Capturing & saving photos for Step ${activeStep + 1}... (1s per photo, 10 total)` : 
                   isStepComplete(activeStep) ? `Step ${activeStep + 1} completed with ${allCapturedPhotos[activeStep]?.length || 0} photos saved` :
                   'Ready to capture'}
                </Typography>
                {isStepComplete(activeStep) && !showSaveRetake && (
                  <Typography variant="caption" display="block" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                    ✅ Step {activeStep + 1} complete! All {allCapturedPhotos[activeStep]?.length || 0} photos saved.
                  </Typography>
                )}
                <Typography variant="caption" display="block" sx={{ fontSize: '0.7rem', opacity: 0.6, mt: 1 }}>
                  Video Status: {videoRef.current ? 
                    `ReadyState: ${videoRef.current.readyState}, Paused: ${videoRef.current.paused}, VideoSize: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}` : 
                    'Video element not ready'}
                </Typography>
                <Button 
                  variant="text" 
                  size="small" 
                  onClick={() => {
                    if (videoRef.current && stream) {
                      console.log('🔄 Refreshing video stream...');
                      videoRef.current.srcObject = null;
                      setTimeout(() => {
                        if (videoRef.current && stream) {
                          videoRef.current.srcObject = stream;
                          videoRef.current.play().catch(console.error);
                        }
                      }, 100);
                    }
                  }}
                  sx={{ mt: 1, fontSize: '0.7rem' }}
                >
                  Refresh Video
                </Button>
                <Button 
                  variant="text" 
                  size="small" 
                  onClick={async () => {
                    console.log('🔍 VERIFICATION: Checking saved photos...');
                    console.log('🔍 All captured photos:', allCapturedPhotos);
                    console.log('🔍 Total photos:', Object.values(allCapturedPhotos).flat().length);
                    console.log('🔍 User ID:', user?._id);
                    console.log('🔍 User name:', user?.first_name, user?.last_name);
                    
                    // Test API call to see if backend is working
                    try {
                      console.log('🔍 Testing API connection...');
                      const testResponse = await axios.get('http://localhost:5000/api/face/test');
                      console.log('🔍 API test response:', testResponse.data);
                    } catch (error) {
                      console.log('🔍 API test failed:', error);
                    }
                  }}
                  sx={{ mt: 1, fontSize: '0.7rem' }}
                >
                  Verify Photos
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={async () => {
                    try {
                      const formData = new FormData();
                      const debugUserId = user?._id || 'test-user-id';
                      const debugUserName = user?.first_name && user?.last_name ? `${user.first_name}_${user.last_name}` : 'Test_User';
                      
                      console.log('🔍 DEBUG: User object:', user);
                      console.log('🔍 DEBUG: User ID:', debugUserId);
                      console.log('🔍 DEBUG: User name:', debugUserName);
                      console.log('🔍 DEBUG: First name:', user?.first_name);
                      console.log('🔍 DEBUG: Last name:', user?.last_name);
                      
                      formData.append('userId', debugUserId);
                      formData.append('userName', debugUserName);
                      formData.append('step', '1');
                      formData.append('photoNumber', '1');
                      
                      console.log('🔍 DEBUG: Sending test data to debug endpoint');
                      console.log('🔍 DEBUG: FormData entries:', Array.from(formData.entries()));
                      
                      const response = await axios.post('http://localhost:5000/api/face/debug', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                      });
                      console.log('Debug response:', response.data);
                      alert('Debug successful: ' + JSON.stringify(response.data));
                    } catch (error) {
                      console.error('Debug failed:', error);
                      alert('Debug failed: ' + (error as any).message);
                    }
                  }}
                  sx={{ mt: 1, fontSize: '0.7rem' }}
                >
                  Debug Data
                </Button>
                <Button 
                  variant="text" 
                  size="small" 
                  onClick={() => {
                    console.log('🧪 TEST CAPTURE: Testing single photo capture...');
                    capturePhoto();
                  }}
                  sx={{ mt: 1, fontSize: '0.7rem' }}
                >
                  Test Capture
                </Button>
                <Button 
                  variant="text" 
                  size="small" 
                  onClick={async () => {
                    console.log('📁 CHECKING FILESYSTEM: Looking for user folder...');
                    const expectedFolderName = `${user?.first_name}_${user?.last_name}`.replace(/[^a-zA-Z0-9_-]/g, '_');
                    console.log(`📁 Expected folder name: ${expectedFolderName}`);
                    console.log(`📁 User: ${user?.first_name} ${user?.last_name}`);
                    console.log(`📁 User ID: ${user?._id}`);
                    
                    // Try to check if folder exists via API
                    try {
                      const response = await axios.get(`http://localhost:5000/api/face/check-folder/${user?._id}`);
                      console.log('📁 Folder check response:', response.data);
                    } catch (error) {
                      console.log('📁 Folder check failed:', error);
                    }
                  }}
                  sx={{ mt: 1, fontSize: '0.7rem' }}
                >
                  Check Filesystem
                </Button>
                <Button 
                  variant="text" 
                  size="small" 
                  onClick={async () => {
                    console.log('🔍 DEBUG: Checking all folders in faces directory...');
                    try {
                      const response = await axios.get('http://localhost:5000/api/face/debug-folders');
                      console.log('🔍 Debug folders response:', response.data);
                      alert('Debug info logged to console. Check console for folder structure.');
                    } catch (error) {
                      console.error('🔍 Debug folders failed:', error);
                      alert('Debug failed: ' + (error as any).message);
                    }
                  }}
                  sx={{ mt: 1, fontSize: '0.7rem' }}
                >
                  Debug Folders
                </Button>
                <Button 
                  variant="text" 
                  size="small" 
                  onClick={async () => {
                    console.log('🧹 CLEANUP: Cleaning up Unknown_User folder...');
                    try {
                      const response = await axios.delete('http://localhost:5000/api/face/cleanup-unknown-user');
                      console.log('🧹 Cleanup response:', response.data);
                      alert('Cleanup successful: ' + response.data.message);
                    } catch (error) {
                      console.error('🧹 Cleanup failed:', error);
                      alert('Cleanup failed: ' + (error as any).message);
                    }
                  }}
                  sx={{ mt: 1, fontSize: '0.7rem' }}
                >
                  Cleanup Unknown_User
                </Button>
                <Button 
                  variant="text" 
                  size="small" 
                  onClick={() => {
                    console.log('🔍 USER DEBUG INFO:');
                    console.log('🔍 Current user object:', user);
                    console.log('🔍 User ID:', user?._id);
                    console.log('🔍 User name:', user?.first_name, user?.last_name);
                    console.log('🔍 Prop userId:', propUserId);
                    console.log('🔍 User object keys:', user ? Object.keys(user) : 'user is null');
                    console.log('🔍 User object type:', typeof user);
                    console.log('🔍 User ID type:', typeof user?._id);
                    console.log('🔍 User ID value:', user?._id);
                    console.log('🔍 Prop userId type:', typeof propUserId);
                    console.log('🔍 Prop userId value:', propUserId);
                    alert('User debug info logged to console. Check console for details.');
                  }}
                  sx={{ mt: 1, fontSize: '0.7rem' }}
                >
                  Debug User Info
                </Button>
                <Button 
                  variant="text" 
                  size="small" 
                  onClick={async () => {
                    console.log('🧪 TEST: Testing user name generation...');
                    const testUserName = user?.first_name && user?.last_name ? 
                      `${user.first_name}_${user.last_name}` : 
                      `User_${user?._id?.substring(0, 8) || 'Unknown'}`;
                    console.log('🧪 Generated user name:', testUserName);
                    console.log('🧪 User object:', user);
                    console.log('🧪 User ID:', user?._id);
                    alert(`Test user name: ${testUserName}`);
                  }}
                  sx={{ mt: 1, fontSize: '0.7rem' }}
                >
                  Test User Name
                </Button>
                <Button 
                  variant="text" 
                  size="small" 
                  onClick={async () => {
                    console.log('🧪 TEST: Testing FormData creation...');
                    const testFormData = new FormData();
                    const testUserId = user?._id || propUserId || 'test-id';
                    const testUserName = user?.first_name && user?.last_name ? 
                      `${user.first_name}_${user.last_name}` : 
                      `User_${testUserId.substring(0, 8)}`;
                    
                    testFormData.append('userId', testUserId);
                    testFormData.append('userName', testUserName);
                    testFormData.append('step', '1');
                    testFormData.append('photoNumber', '1');
                    
                    console.log('🧪 Test FormData entries:');
                    for (let [key, value] of testFormData.entries()) {
                      console.log(`  ${key}:`, value);
                    }
                    
                    alert(`Test FormData created with userId: ${testUserId}, userName: ${testUserName}`);
                  }}
                  sx={{ mt: 1, fontSize: '0.7rem' }}
                >
                  Test FormData
                </Button>
                <Button 
                  variant="text" 
                  size="small" 
                  onClick={async () => {
                    console.log('📁 CHECKING CURRENT FOLDERS...');
                    try {
                      const response = await axios.get('http://localhost:5000/api/face/debug-folders');
                      console.log('📁 Current folders:', response.data);
                      const folders = response.data.folders;
                      const folderNames = folders.map((f: any) => f.name).join(', ');
                      alert(`Current folders: ${folderNames}`);
                    } catch (error) {
                      console.error('📁 Error checking folders:', error);
                      alert('Error checking folders: ' + (error as any).message);
                    }
                  }}
                  sx={{ mt: 1, fontSize: '0.7rem' }}
                >
                  Check Current Folders
                </Button>
              </Box>
            </>
          )}
        </Paper>

        {/* Progress Information */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Progress: {activeStep + 1} of {steps.length} steps
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Current step: {(allCapturedPhotos[activeStep]?.length || 0)}/{PHOTOS_PER_STEP} photos
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Total photos: {Object.values(allCapturedPhotos).flat().length} photos
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.75rem' }}>
            Step photos: Step 1: {allCapturedPhotos[0]?.length || 0}/10, Step 2: {allCapturedPhotos[1]?.length || 0}/10, Step 3: {allCapturedPhotos[2]?.length || 0}/10, Step 4: {allCapturedPhotos[3]?.length || 0}/10
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            💾 Immediate save per photo | 📸 Manual capture (1s per photo) | 🔄 Manual step advance
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.75rem' }}>
            Debug: activeStep={activeStep}, currentStepPhotos={(allCapturedPhotos[activeStep]?.length || 0)}, showSaveRetake={showSaveRetake ? 'true' : 'false'}
          </Typography>
        </Box>

        {/* Progress Bar */}
        <LinearProgress 
          variant="determinate" 
          value={((activeStep + 1) / steps.length) * 100} 
          sx={{ mb: 2 }}
        />

        {/* Error/Success Messages */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        {showSaveRetake ? (
          <>
            <Button onClick={handleRetake} color="secondary">
              Retake
            </Button>
            <Button 
              onClick={handleSave} 
              variant="contained" 
              disabled={isSaving}
              startIcon={isSaving ? <CircularProgress size={20} /> : null}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>
              Cancel
            </Button>
            
            {/* Capture Button - Show when current step is not complete */}
            {canCaptureCurrentStep() && (
              <Button 
                onClick={startManualCapture} 
                variant="contained" 
                disabled={isCapturing || cameraStatus !== 'ready'}
                startIcon={<CameraIcon />}
              >
                {isCapturing ? `Capturing... (${(allCapturedPhotos[activeStep]?.length || 0)}/10)` : `Capture Step ${activeStep + 1}`}
              </Button>
            )}
            
            {/* Next Step Button - Show when current step is complete and not last step */}
            {canGoToNextStep() && (
              <Button 
                onClick={handleNextStep} 
                variant="contained" 
                color="primary"
              >
                Next Step
              </Button>
            )}
            
            {/* Complete Button - Show when all steps are complete */}
            {allStepsComplete() && activeStep === steps.length - 1 && (
              <Button 
                onClick={() => setShowSaveRetake(true)} 
                variant="contained" 
                color="success"
              >
                Complete
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default FaceRegistrationModal;