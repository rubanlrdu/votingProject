import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

interface RealtimePhotoCaptureProps {
    onPhotoCaptured: (photoFile: File) => void;
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const VideoContainer = styled.div`
    position: relative;
    width: 100%;
    max-width: 640px;
    border-radius: 8px;
    overflow: hidden;
    background: #000;
`;

const Video = styled.video`
    width: 100%;
    height: auto;
    display: block;
`;

const Canvas = styled.canvas`
    display: none;
`;

const Button = styled.button`
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    font-weight: 600;
    color: white;
    background-color: #007bff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
        background-color: #0056b3;
    }

    &:disabled {
        background-color: #ccc;
        cursor: not-allowed;
    }
`;

const ErrorMessage = styled.div`
    color: #dc3545;
    font-size: 0.875rem;
    text-align: center;
`;

const RealtimePhotoCapture: React.FC<RealtimePhotoCaptureProps> = ({ onPhotoCaptured }) => {
    const [error, setError] = useState<string | null>(null);
    const [isStreamActive, setIsStreamActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        const initializeCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: 'user'
                    }
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    streamRef.current = stream;
                    setIsStreamActive(true);
                    setError(null);
                }
            } catch (err) {
                setError('Failed to access camera. Please ensure you have granted camera permissions.');
                console.error('Camera access error:', err);
            }
        };

        initializeCamera();

        // Cleanup function
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                setIsStreamActive(false);
            }
        };
    }, []);

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) {
            setError('Failed to get canvas context');
            return;
        }

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the current video frame onto the canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to file
        canvas.toBlob((blob) => {
            if (blob) {
                const photoFile = new File([blob], "realtime_photo.png", { type: "image/png" });
                onPhotoCaptured(photoFile);
            } else {
                setError('Failed to capture photo');
            }
        }, 'image/png');
    };

    return (
        <Container>
            <VideoContainer>
                <Video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                />
            </VideoContainer>
            <Canvas ref={canvasRef} />
            <Button
                onClick={handleCapture}
                disabled={!isStreamActive}
            >
                Take Photo
            </Button>
            {error && <ErrorMessage>{error}</ErrorMessage>}
        </Container>
    );
};

export default RealtimePhotoCapture; 