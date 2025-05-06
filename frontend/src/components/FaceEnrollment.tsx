import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { loadFaceApiModels } from '../utils/faceApiHelper';
import styles from './FaceEnrollment.module.css';

interface FaceEnrollmentProps {
  userId: string;
  onEnrollmentComplete?: (success: boolean) => void;
}

const FaceEnrollment: React.FC<FaceEnrollmentProps> = ({ userId, onEnrollmentComplete }) => {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionInterval, setDetectionInterval] = useState<number | null>(null);
  const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(null);
  const [feedback, setFeedback] = useState({
    message: 'Loading face recognition models...',
    isError: false,
    isSuccess: false
  });
  const [enrollmentStatus, setEnrollmentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');

  // Initialize face detection
  useEffect(() => {
    const initializeFaceDetection = async () => {
      try {
        setIsModelLoading(true);
        
        // Check if models directory exists
        console.log('Checking for face-api.js model files...');
        try {
          const modelCheck = await fetch('/models/ssd_mobilenetv1_model-weights_manifest.json');
          console.log('Model check response:', modelCheck.status);
          if (!modelCheck.ok) {
            console.error('Face API models not found in /models directory!');
            throw new Error('Face recognition models not found. Please check your model files.');
          } else {
            console.log('Model manifest found, proceeding to load...');
          }
        } catch (modelError) {
          console.error('Error checking model files:', modelError);
          throw new Error('Unable to access face recognition models. Check your network connection and try again.');
        }
        
        // Load models if not already loaded
        console.log('Loading face-api.js models...');
        await loadFaceApiModels();
        console.log('Models loaded successfully!');
        setIsModelLoading(false);
        setFeedback({
          message: 'Models loaded. Initializing camera...',
          isError: false,
          isSuccess: false
        });

        // Request camera access
        console.log('Requesting camera access...');
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        });
        console.log('Camera access granted!');

        // Set stream
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          console.log('Video element stream set');
        } else {
          console.error('Video ref is null');
        }

        setFeedback({
          message: 'Camera initialized. Position your face in the frame.',
          isError: false,
          isSuccess: false
        });
      } catch (error) {
        console.error('Error initializing face detection:', error);
        setFeedback({
          message: error instanceof Error
            ? `Error: ${error.message}`
            : 'Failed to initialize face detection',
          isError: true,
          isSuccess: false
        });
      }
    };

    initializeFaceDetection();

    // Cleanup function
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        console.log('Camera stream stopped');
      }
      if (detectionInterval) {
        clearInterval(detectionInterval);
        console.log('Detection interval cleared');
      }
    };
  }, []);

  // Set up face detection when video is playing
  useEffect(() => {
    if (!videoRef.current || !canvasRef.current || isModelLoading) return;

    const video = videoRef.current;

    const onPlay = () => {
      if (isDetecting) return;

      // Set canvas dimensions to match video
      if (canvasRef.current && video) {
        canvasRef.current.width = video.videoWidth;
        canvasRef.current.height = video.videoHeight;
        
        // Add debug text to canvas
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.fillRect(10, 10, 300, 30);
          ctx.font = '14px Arial';
          ctx.fillStyle = 'black';
          ctx.fillText('Face detection initialized...', 15, 30);
        }
      }

      setIsDetecting(true);
      console.log('Face detection started - Video dimensions:', video.videoWidth, 'x', video.videoHeight);

      // Start detection interval
      const interval = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) return;

        try {
          console.log('Attempting face detection...');
          
          // Draw debug info on canvas before detection
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            // Clear previous drawings
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            
            // Draw a simple frame to show the detection area
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(50, 50, canvasRef.current.width - 100, canvasRef.current.height - 100);
            
            // Show detection status
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillRect(10, 10, 300, 30);
            ctx.font = '14px Arial';
            ctx.fillStyle = 'black';
            ctx.fillText('Scanning for face... (confidence: 0.3)', 15, 30);
          }

          // Detect face using SSD MobileNet for better accuracy
          const detection = await faceapi.detectSingleFace(
            videoRef.current,
            new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 })
          )
            .withFaceLandmarks()
            .withFaceDescriptor();

          // Get canvas context
          if (!ctx) return;

          // Clear canvas
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

          if (detection) {
            console.log('Face detected!', detection);
            
            // Draw detection box
            const { detection: faceDetection } = detection;
            const box = faceDetection.box;
            
            // Draw rectangle
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(box.x, box.y, box.width, box.height);
            
            // Draw detection info
            ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
            ctx.fillRect(10, 10, 300, 30);
            ctx.font = '14px Arial';
            ctx.fillStyle = 'black';
            ctx.fillText(`Face detected! Score: ${faceDetection.score.toFixed(2)}`, 15, 30);

            // Update feedback
            setFeedback({
              message: 'Face detected! You can now enroll your face.',
              isError: false,
              isSuccess: true
            });

            // Store face descriptor
            setFaceDescriptor(detection.descriptor);
          } else {
            console.log('No face detected in this frame');
            
            // Draw no-detection info
            ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
            ctx.fillRect(10, 10, 300, 30);
            ctx.font = '14px Arial';
            ctx.fillStyle = 'black';
            ctx.fillText('No face detected. Position yourself properly.', 15, 30);
            
            setFeedback({
              message: 'No face detected. Please position yourself properly.',
              isError: false,
              isSuccess: false
            });
            setFaceDescriptor(null);
          }
        } catch (error) {
          console.error('Error during face detection:', error);
          
          // Show error on canvas
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            ctx.fillRect(10, 10, 300, 30);
            ctx.font = '14px Arial';
            ctx.fillStyle = 'white';
            ctx.fillText('Error in face detection process!', 15, 30);
          }
        }
      }, 100);

      setDetectionInterval(interval);
    };

    // Add event listener for video playback
    video.addEventListener('play', onPlay);

    return () => {
      video.removeEventListener('play', onPlay);
      if (detectionInterval) {
        clearInterval(detectionInterval);
        setDetectionInterval(null);
      }
      setIsDetecting(false);
      console.log('Face detection cleanup completed');
    };
  }, [isModelLoading, isDetecting]);

  // Handle enrollment submission
  const handleEnrollFace = async () => {
    if (!faceDescriptor) {
      setFeedback({
        message: 'No valid face detected. Please position yourself properly.',
        isError: true,
        isSuccess: false
      });
      return;
    }

    try {
      setEnrollmentStatus('processing');
      setFeedback({
        message: 'Enrolling your face...',
        isError: false,
        isSuccess: false
      });

      // Convert Float32Array to regular array for JSON serialization
      const descriptorArray = Array.from(faceDescriptor);

      // Send facial data to backend
      const response = await fetch('http://localhost:3001/api/auth/enroll-face', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          faceDescriptor: descriptorArray
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to enroll face');
      }

      // Success
      setEnrollmentStatus('success');
      setFeedback({
        message: 'Face enrolled successfully! You can now use face recognition to log in.',
        isError: false,
        isSuccess: true
      });

      // Notify parent component if callback provided
      if (onEnrollmentComplete) {
        onEnrollmentComplete(true);
      }
    } catch (error) {
      console.error('Error enrolling face:', error);
      setEnrollmentStatus('failed');
      setFeedback({
        message: error instanceof Error 
          ? `Error: ${error.message}` 
          : 'Failed to enroll face',
        isError: true,
        isSuccess: false
      });

      // Notify parent component if callback provided
      if (onEnrollmentComplete) {
        onEnrollmentComplete(false);
      }
    }
  };

  // Stop webcam
  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (detectionInterval) {
      clearInterval(detectionInterval);
      setDetectionInterval(null);
    }
    setIsDetecting(false);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Face Enrollment</h2>
      
      <div className={styles.feedbackMessage} 
        data-error={feedback.isError} 
        data-success={feedback.isSuccess}>
        {feedback.message}
      </div>
      
      <div className={styles.videoContainer}>
        <video
          ref={videoRef}
          className={styles.video}
          autoPlay
          playsInline
          muted
        />
        <canvas ref={canvasRef} className={styles.canvas} />
        
        {isModelLoading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
            <p>Loading face recognition models...</p>
          </div>
        )}
      </div>
      
      <div className={styles.controls}>
        <button
          className={styles.enrollButton}
          onClick={handleEnrollFace}
          disabled={!faceDescriptor || enrollmentStatus === 'processing' || enrollmentStatus === 'success'}
        >
          {enrollmentStatus === 'processing' ? 'Enrolling...' : 'Capture & Enroll Face'}
        </button>
        
        {stream && (
          <button className={styles.cancelButton} onClick={stopWebcam}>
            Stop Camera
          </button>
        )}
      </div>
      
      {enrollmentStatus === 'success' && (
        <div className={styles.successMessage}>
          <p>✅ Face enrollment successful!</p>
        </div>
      )}
    </div>
  );
};

export default FaceEnrollment; 