import * as faceapi from 'face-api.js';

/**
 * Loads all required face-api.js models from the public directory
 * @returns Promise that resolves when all models are loaded
 */
export const loadFaceApiModels = async (): Promise<void> => {
  try {
    const MODEL_URL = '/models';
    
    // Load all required models in parallel
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
    ]);
    
    console.log('Face-API models loaded successfully');
  } catch (error) {
    console.error('Error loading Face-API models:', error);
    throw new Error('Failed to load face recognition models');
  }
}; 