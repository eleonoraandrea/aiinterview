import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, StopCircle, Video } from 'lucide-react';

interface RecorderProps {
  onRecordingComplete: (blob: Blob) => void;
}

export const Recorder: React.FC<RecorderProps> = ({ onRecordingComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');

  // Initialize Camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720, facingMode: "user" }, 
          audio: true 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing media devices:", err);
        setError("Unable to access camera or microphone. Please check permissions.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, timeLeft, stopRecording]);

  const startRecording = () => {
    if (!stream) return;
    
    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      onRecordingComplete(blob);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
    setTimeLeft(30);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-6 text-center bg-red-50 rounded-xl border border-red-200">
        <Video className="w-10 h-10 text-red-400 mb-2" />
        <p className="text-red-700 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto bg-black rounded-2xl overflow-hidden shadow-xl aspect-video group">
      <video 
        ref={videoRef} 
        autoPlay 
        muted 
        playsInline 
        className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
      />
      
      {/* Overlay UI */}
      <div className="absolute inset-0 flex flex-col justify-between p-6 bg-gradient-to-b from-black/40 via-transparent to-black/40">
        <div className="flex justify-between items-start">
          <div className="bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm font-medium border border-white/10">
            AI Interview Mode
          </div>
          <div className={`px-4 py-1 rounded-full font-mono font-bold text-lg transition-colors duration-300 ${timeLeft <= 5 && isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-black/50 text-white'}`}>
            00:{timeLeft.toString().padStart(2, '0')}
          </div>
        </div>

        <div className="flex justify-center">
          {!isRecording ? (
            <button 
              onClick={startRecording}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-lg shadow-red-900/50"
            >
              <Camera className="w-6 h-6" />
              Start Recording
            </button>
          ) : (
            <button 
              onClick={stopRecording}
              className="flex items-center gap-2 bg-white hover:bg-gray-100 text-red-600 px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
            >
              <StopCircle className="w-6 h-6" />
              Stop
            </button>
          )}
        </div>
      </div>
    </div>
  );
};