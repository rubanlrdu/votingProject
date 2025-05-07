import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { loadFaceApiModels } from '../utils/faceApiHelper';
import styles from './FaceEnrollment.module.css';

interface FaceVerificationProps {
  userId: string;
  onVerificationSuccess: () => void;
  onVerificationFail: () => void;
  mode?: 'login' | 'password-reset';
}

const FaceVerification: React.FC<FaceVerificationProps> = ({ 
  userId, 
  onVerificationSuccess, 
  onVerificationFail,
  mode = 'login'
}) => {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionInterval, setDetectionInterval] = useState<number | null>(null);
  const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(null);
  const [message, setMessage] = useState('Loading face recognition models...');
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [autoVerify, setAutoVerify] = useState(false);
  
  // Load models and initialize camera
  useEffect(() => {
    async function init() {
      try {
        setMessage('Loading face recognition models...');
        setDebugInfo(prev => [...prev, 'Starting face recognition model loading']);
        
        // Load models from public directory
        const MODEL_URL = '/models';
        
        // Check if models directory exists
        try {
          const testFetch = await fetch(`${MODEL_URL}/tiny_face_detector_model-weights_manifest.json`);
          setDebugInfo(prev => [...prev, `Model manifest fetch status: ${testFetch.status}`]);
          if (!testFetch.ok) {
            throw new Error(`Model manifest fetch failed with status: ${testFetch.status}`);
          }
        } catch (fetchError) {
          setDebugInfo(prev => [...prev, `Model fetch error: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`]);
          throw fetchError;
        }
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        
        console.log('Face recognition models loaded');
        setDebugInfo(prev => [...prev, 'Face models loaded successfully']);
        setIsModelLoading(false);
        setMessage('Initializing camera...');
        
        // Access webcam
        const media = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = media;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => {
              setDebugInfo(prev => [...prev, `Video play error: ${e.message}`]);
            });
          };
          
          // Add explicit play handler
          videoRef.current.onplay = () => {
            setDebugInfo(prev => [...prev, 'Video play event triggered']);
            startFaceDetection();
          };
          
          setStream(media);
          setMessage('Position your face in the frame for verification');
        } else {
          console.error('Video element not available');
        }
      } catch (error) {
        console.error('Error initializing:', error);
        setMessage(`Error: ${error instanceof Error ? error.message : 'Failed to initialize'}`);
      }
    }
    
    init();
    
    // Cleanup
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (detectionInterval) {
        clearInterval(detectionInterval);
      }
    };
  }, []);
  
  // Define a function to start face detection
  const startFaceDetection = () => {
    if (isDetecting || !videoRef.current || !canvasRef.current || !stream) {
      setDebugInfo(prev => [...prev, `Cannot start detection. isDetecting=${isDetecting}, video=${!!videoRef.current}, canvas=${!!canvasRef.current}, stream=${!!stream}`]);
      return;
    }
    
    setIsDetecting(true);
    setDebugInfo(prev => [...prev, 'Starting face detection']);
    console.log('Video is playing, starting detection');
    
    // Initialize canvas
    if (canvasRef.current) {
      canvasRef.current.width = videoRef.current.videoWidth || 640;
      canvasRef.current.height = videoRef.current.videoHeight || 480;
    }
    
    // Start detection loop
    const interval = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;
      
      // Explicitly log video dimensions
      const videoDimensions = {
        videoWidth: videoRef.current.videoWidth,
        videoHeight: videoRef.current.videoHeight,
        clientWidth: videoRef.current.clientWidth,
        clientHeight: videoRef.current.clientHeight
      };
      
      // Only update debug info occasionally to avoid excessive rerenders
      if (Math.random() < 0.1) {
        setDebugInfo(prev => {
          const newDebugInfo = [...prev]; 
          if (newDebugInfo.length > 20) newDebugInfo.shift(); // Keep only last 20 items
          return [...newDebugInfo, `Video: ${JSON.stringify(videoDimensions)}`];
        });
      }
      
      // Use a lower confidence threshold for better detection
      const options = new faceapi.TinyFaceDetectorOptions({ 
        inputSize: 320, 
        scoreThreshold: 0.2
      });
      
      try {
        // Add timing information
        const startTime = performance.now();
        
        // Detect face
        const result = await faceapi.detectSingleFace(videoRef.current, options)
          .withFaceLandmarks()
          .withFaceDescriptor();
        
        const endTime = performance.now();
        const processingTime = (endTime - startTime).toFixed(2);
        
        // Occasionally log detection results
        if (Math.random() < 0.1) {
          setDebugInfo(prev => {
            const newDebugInfo = [...prev];
            if (newDebugInfo.length > 20) newDebugInfo.shift();
            return [...newDebugInfo, `Detection: ${result ? 'SUCCESS' : 'FAILED'} (${processingTime}ms)`];
          });
        }
        
        // Draw to canvas
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Always draw a guide box
        const guideX = canvasRef.current.width / 2 - 100;
        const guideY = canvasRef.current.height / 2 - 120;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(guideX, guideY, 200, 240);
        ctx.setLineDash([]);
        
        // Add debug info regardless of detection
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(10, 10, 300, 90);
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.fillText(`Canvas: ${canvasRef.current.width}x${canvasRef.current.height}`, 15, 30);
        ctx.fillText(`Face detection active: threshold = 0.2`, 15, 50);
        ctx.fillText(`Face detected: ${result ? 'YES' : 'NO'}`, 15, 70);
        ctx.fillText(`Detection state: ${isDetecting ? 'RUNNING' : 'IDLE'}`, 15, 90);
        
        if (result) {
          // Draw rectangle around face
          const box = result.detection.box;
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 3;
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          
          // Draw confidence score
          ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
          ctx.fillRect(box.x, box.y - 35, 200, 30);
          ctx.fillStyle = '#000000';
          ctx.font = '16px Arial';
          ctx.fillText(`Score: ${result.detection.score.toFixed(2)}`, box.x + 5, box.y - 15);
          
          // Draw facial landmarks
          const landmarks = result.landmarks;
          const positions = landmarks.positions;
          
          // Draw dots at each landmark position
          ctx.fillStyle = '#ff0000';
          positions.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
            ctx.fill();
          });
          
          // Store descriptor
          setFaceDescriptor(result.descriptor);
          setMessage('Face detected! Ready for verification.');
          
          // Auto verify if enabled
          if (autoVerify && verificationStatus === 'idle') {
            handleVerifyFace();
          }
        } else {
          // Enhanced guidance message
          ctx.fillStyle = 'rgba(255, 200, 0, 0.7)';
          ctx.fillRect(canvasRef.current.width/2 - 150, canvasRef.current.height - 40, 300, 30);
          ctx.fillStyle = '#000000';
          ctx.font = '16px Arial';
          ctx.fillText('Position your face in the center of the frame', canvasRef.current.width/2 - 140, canvasRef.current.height - 20);
          
          setFaceDescriptor(null);
          setMessage('No face detected. Please position yourself properly.');
        }
      } catch (error) {
        console.error('Error in detection:', error);
      }
    }, 100); // Fast interval for responsive feedback
    
    setDetectionInterval(interval);
  };
  
  // If video is already loaded but detection isn't running, start it after 3 seconds
  useEffect(() => {
    if (stream && videoRef.current && !isDetecting) {
      setDebugInfo(prev => [...prev, 'Attempting to start detection in 3 seconds...']);
      const timer = setTimeout(() => {
        startFaceDetection();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [stream, isDetecting]);
  
  // Handle verification process
  const handleVerifyFace = async () => {
    if (!faceDescriptor) return;

    try {
      setVerificationStatus('processing');
      setMessage('Verifying face...');

      // Convert Float32Array to regular array for JSON serialization
      const descriptorArray = Array.from(faceDescriptor);

      // Choose endpoint based on mode
      const endpoint = mode === 'password-reset' 
        ? 'http://localhost:3001/api/auth/forgot-password/verify-face'
        : 'http://localhost:3001/api/auth/verify-face';

      // Prepare request body based on mode
      const requestBody = mode === 'password-reset'
        ? { username: userId, liveDescriptor: descriptorArray }
        : { userId, faceDescriptor: descriptorArray };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (data.success) {
        setVerificationStatus('success');
        setMessage('Face verification successful!');
        onVerificationSuccess();
      } else {
        setVerificationStatus('failed');
        setMessage('Face verification failed. Please try again.');
        onVerificationFail();
      }
    } catch (error) {
      console.error('Face verification error:', error);
      setVerificationStatus('failed');
      setMessage('An error occurred during verification. Please try again.');
      onVerificationFail();
    }
  };
  
  // Stop webcam handler
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
  
  // Add tests for backend connectivity
  const checkBackendConnection = async () => {
    setDebugInfo(prev => [...prev, 'Testing backend server connection...']);
    try {
      const response = await fetch('http://localhost:3001/api/auth/session', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      setDebugInfo(prev => [
        ...prev, 
        `Backend connection test: Status ${response.status}`
      ]);
      
      return response.ok;
    } catch (error) {
      setDebugInfo(prev => [
        ...prev, 
        `Backend connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
      ]);
      return false;
    }
  };
  
  // Try alternative detection for debugging
  const tryAlternativeDetection = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setDebugInfo(prev => [...prev, 'Cannot start alternative detection - refs not available']);
      return;
    }
    
    setDebugInfo(prev => [...prev, 'Trying alternative face detection approach...']);
    
    try {
      // Try the lowest possible threshold
      const options = new faceapi.TinyFaceDetectorOptions({ 
        inputSize: 160, // Smaller for faster processing
        scoreThreshold: 0.1  // Very low threshold
      });
      
      // Get video element dimensions for canvas
      canvasRef.current.width = videoRef.current.videoWidth || 640;
      canvasRef.current.height = videoRef.current.videoHeight || 480;
      
      // Try direct detection
      const detections = await faceapi.detectAllFaces(
        videoRef.current, 
        options
      );
      
      // Show what we found
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        // Clear canvas
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Draw debug info
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(10, 10, 400, 60);
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.fillText(`Alternative detection found: ${detections.length} faces`, 20, 30);
        ctx.fillText(`Canvas: ${canvasRef.current.width}x${canvasRef.current.height}`, 20, 55);
        
        // Draw boxes for any detections
        if (detections.length > 0) {
          detections.forEach(detection => {
            const box = detection.box;
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.strokeRect(box.x, box.y, box.width, box.height);
            
            // Show score
            ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            ctx.fillRect(box.x, box.y - 30, 100, 25);
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px Arial';
            ctx.fillText(`Score: ${detection.score.toFixed(2)}`, box.x + 5, box.y - 12);
          });
          
          setDebugInfo(prev => [
            ...prev, 
            `Found ${detections.length} faces with scores: ${detections.map(d => d.score.toFixed(2)).join(', ')}`
          ]);
        } else {
          setDebugInfo(prev => [...prev, 'No faces found with alternative detection']);
        }
      }
    } catch (error) {
      setDebugInfo(prev => [
        ...prev, 
        `Alternative detection error: ${error instanceof Error ? error.message : 'Unknown error'}`
      ]);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Face Verification</h2>
      
      <div className={styles.feedbackMessage}>
        {message}
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
          onClick={handleVerifyFace}
          disabled={!faceDescriptor || verificationStatus === 'processing' || verificationStatus === 'success'}
        >
          {verificationStatus === 'processing' ? 'Verifying...' : 'Verify Identity'}
        </button>
        
        {stream && !isDetecting && (
          <button 
            className={styles.actionButton} 
            onClick={startFaceDetection}
            style={{ 
              marginLeft: '10px', 
              background: '#0066cc', 
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Start Face Detection
          </button>
        )}
        
        <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
          <label style={{ marginRight: '10px' }}>
            <input 
              type="checkbox" 
              checked={autoVerify} 
              onChange={() => setAutoVerify(!autoVerify)} 
            />
            Auto-verify when face detected
          </label>
        </div>
        
        {stream && (
          <button className={styles.cancelButton} onClick={stopWebcam}>
            Stop Camera
          </button>
        )}
        
        <button 
          className={styles.debugButton} 
          onClick={() => setShowDebugInfo(!showDebugInfo)} 
          style={{ marginTop: '10px', background: '#333', color: 'white', padding: '5px 10px' }}
        >
          {showDebugInfo ? 'Hide Debug Info' : 'Show Debug Info'}
        </button>
      </div>
      
      {showDebugInfo && (
        <div className={styles.debugInfo} style={{ 
          margin: '10px', 
          padding: '10px', 
          background: '#000', 
          color: '#0f0', 
          fontFamily: 'monospace',
          border: '1px solid #333',
          borderRadius: '4px',
          maxHeight: '150px',
          overflow: 'auto'
        }}>
          <h4>Debug Information:</h4>
          <ul style={{ listStyleType: 'none', padding: '0' }}>
            <li>- Models loaded: {!isModelLoading ? 'Yes' : 'No'}</li>
            <li>- Stream active: {stream ? 'Yes' : 'No'}</li>
            <li>- Detection running: {isDetecting ? 'Yes' : 'No'}</li>
            <li>- Face detected: {faceDescriptor ? 'Yes' : 'No'}</li>
            <li>- Canvas dimensions: {canvasRef.current ? `${canvasRef.current.width}x${canvasRef.current.height}` : 'Unknown'}</li>
            <li>- Video dimensions: {videoRef.current ? `${videoRef.current.videoWidth}x${videoRef.current.videoHeight}` : 'Unknown'}</li>
            <li>- Auto-verify: {autoVerify ? 'Enabled' : 'Disabled'}</li>
          </ul>
          
          <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
            <button 
              onClick={checkBackendConnection} 
              style={{ background: '#333', border: '1px solid #666', color: 'white', padding: '3px 8px', fontSize: '12px' }}
            >
              Test Backend
            </button>
            <button 
              onClick={tryAlternativeDetection} 
              style={{ background: '#333', border: '1px solid #666', color: 'white', padding: '3px 8px', fontSize: '12px' }}
            >
              Test Face Detection
            </button>
          </div>
          
          <h4>Log:</h4>
          <div style={{ fontSize: '12px' }}>
            {debugInfo.map((info, index) => (
              <div key={index}>- {info}</div>
            ))}
          </div>
        </div>
      )}
      
      {verificationStatus === 'success' && (
        <div className={styles.successMessage}>
          <p>✅ Identity verified successfully!</p>
        </div>
      )}
      
      {verificationStatus === 'failed' && (
        <div style={{
          background: '#ffdddd',
          color: '#cc0000',
          padding: '10px',
          borderRadius: '4px',
          margin: '10px 0',
          textAlign: 'center'
        }}>
          <p>❌ Identity verification failed</p>
        </div>
      )}
    </div>
  );
};

export default FaceVerification; 