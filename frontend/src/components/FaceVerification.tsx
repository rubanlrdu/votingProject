import React, { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import styles from './FaceVerification.module.css';

interface FaceVerificationProps {
  userId: string;
  onVerificationSuccess: () => void;
  onVerificationFail: () => void;
  mode?: 'login' | 'password-reset';
}

const FaceVerification: React.FC<FaceVerificationProps> = ({ userId, onVerificationSuccess, onVerificationFail, mode = 'login' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationAttempts, setVerificationAttempts] = useState(0);
    const [lastVerificationTime, setLastVerificationTime] = useState(0);
    const [isStreamActive, setIsStreamActive] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const detectionIntervalRef = useRef<number | null>(null);

    // Initialize face-api models
  useEffect(() => {
        const loadModels = async () => {
            try {
                setIsModelLoading(true);
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
                    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                    faceapi.nets.faceRecognitionNet.loadFromUri('/models')
                ]);
                setIsModelLoading(false);
                setIsInitialized(true);
            } catch (err) {
                console.error('Error loading models:', err);
                setError('Failed to load face detection models. Please refresh the page.');
                setIsModelLoading(false);
            }
        };

        loadModels();

        return () => {
            if (detectionIntervalRef.current) {
                window.clearInterval(detectionIntervalRef.current);
            }
            stopVideoStream();
        };
    }, []);

    // Start video stream when models are loaded
    useEffect(() => {
        if (isInitialized && !isStreamActive) {
            startVideo();
        }
    }, [isInitialized]);

    const startVideo = async () => {
        try {
            if (!videoRef.current) return;

            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: "user"
                } 
            });
            
            videoRef.current.srcObject = stream;
            setIsStreamActive(true);
            
            // Wait for video to be ready and have dimensions
            await new Promise((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => {
                        // Set video dimensions
                        videoRef.current!.width = videoRef.current!.videoWidth;
                        videoRef.current!.height = videoRef.current!.videoHeight;
                        resolve(true);
                    };
                }
            });

            // Start face detection after video is ready
            startFaceDetection();
        } catch (err) {
            console.error('Error accessing camera:', err);
            setError('Failed to access camera. Please ensure camera permissions are granted.');
        }
    };

    const stopVideoStream = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
            setIsStreamActive(false);
        }
        if (detectionIntervalRef.current) {
            window.clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
        }
    };

  const startFaceDetection = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        // Ensure video has dimensions
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            console.error('Video dimensions not available');
      return;
    }
    
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        faceapi.matchDimensions(canvas, displaySize);

        detectionIntervalRef.current = window.setInterval(async () => {
            if (!video || !canvas || !isInitialized) return;

            // Check if video is playing and has dimensions
            if (video.readyState !== 4 || video.videoWidth === 0 || video.videoHeight === 0) {
                return;
            }

            try {
                const detections = await faceapi.detectSingleFace(
                    video,
                    new faceapi.TinyFaceDetectorOptions({ inputSize: 224 })
                ).withFaceLandmarks().withFaceDescriptor();

                if (detections) {
                    // Draw face detection
                    const resizedDetections = faceapi.resizeResults(detections, displaySize);
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        faceapi.draw.drawDetections(canvas, resizedDetections);
                        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
                    }

                    // Verify face if not already verifying
                    if (!isVerifying && Date.now() - lastVerificationTime > 2000) {
                        verifyFace(detections.descriptor);
          }
        } else {
                    // Clear canvas if no face detected
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                    }
                }
            } catch (err) {
                console.error('Error in detection:', err);
                setError('Error detecting face. Please try again.');
            }
        }, 100);
    };

    const verifyFace = async (descriptor: Float32Array) => {
        if (isVerifying) return;
        
        setIsVerifying(true);
        setLastVerificationTime(Date.now());
        
        try {
            const endpoint = mode === 'password-reset' 
                ? 'http://localhost:3001/api/auth/forgot-password/verify-face'
                : 'http://localhost:3001/api/auth/verify-face';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(
                    mode === 'password-reset'
                        ? { username: userId, liveDescriptor: Array.from(descriptor) }
                        : { userId, liveDescriptor: Array.from(descriptor) }
                ),
            });

            const data = await response.json();

            if (response.ok && (data.verified || data.success)) {
                onVerificationSuccess();
            } else {
                setVerificationAttempts(prev => prev + 1);
                if (verificationAttempts >= 2) {
                    onVerificationFail();
                }
            }
        } catch (err) {
            console.error('Verification error:', err);
            setError('Failed to verify face. Please try again.');
        } finally {
            setIsVerifying(false);
        }
    };

  return (
        <div className={styles.verificationContainer}>
            {isModelLoading ? (
                <div className={styles.loading}>Loading face recognition models...</div>
            ) : (
                <>
                    <div className={styles.videoContainer}>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className={styles.video}
                        />
                        <canvas ref={canvasRef} className={styles.canvas} />
                    </div>
                    {error && <div className={styles.error}>{error}</div>}
                </>
            )}
        </div>
    );
};

export default FaceVerification; 