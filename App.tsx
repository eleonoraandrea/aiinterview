import React, { useState } from 'react';
import { Recorder } from './components/Recorder';
import { Editor } from './components/Editor';
import { analyzeVideoInterview } from './services/geminiService';
import { uploadInterviewVideo, uploadCV, saveInterviewData } from './services/supabaseService';
import { captureVideoFrame, generatePDFCV } from './services/mediaService';
import { AppStep, InterviewSession, AnalysisResult } from './types';
import { Mic, Play, RefreshCw, Save, CheckCircle, Loader2, BrainCircuit, ArrowRight, Database, FileText, Download } from 'lucide-react';

export default function App() {
  const [step, setStep] = useState<AppStep>(AppStep.LANDING);
  const [session, setSession] = useState<InterviewSession>({
    videoBlob: null,
    videoUrl: null,
    analysis: null
  });
  const [finalCvUrl, setFinalCvUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [loadingStatus, setLoadingStatus] = useState<string>('');

  const handleRecordingComplete = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setSession(prev => ({ ...prev, videoBlob: blob, videoUrl: url }));
    setStep(AppStep.REVIEW);
  };

  const handleAnalyze = async () => {
    if (!session.videoBlob) return;
    
    setStep(AppStep.ANALYZING);
    setError('');

    try {
      const result = await analyzeVideoInterview(session.videoBlob);
      setSession(prev => ({ ...prev, analysis: result }));
      setStep(AppStep.EDITING);
    } catch (err) {
      console.error(err);
      setError("Analysis failed. Please ensure your API key is valid or try again.");
      setStep(AppStep.REVIEW);
    }
  };

  const handleSave = async (finalAnalysis: AnalysisResult) => {
    if (!session.videoBlob || !session.videoUrl) return;

    setStep(AppStep.SAVING);
    
    try {
      // 1. Generate Assets
      setLoadingStatus('Generating CV assets...');
      
      // Capture photo from video
      let photoDataUrl = null;
      try {
        photoDataUrl = await captureVideoFrame(session.videoUrl, 1.0);
      } catch (e) {
        console.warn("Could not capture frame for CV", e);
      }

      // Generate PDF
      const pdfBlob = generatePDFCV(finalAnalysis, photoDataUrl);

      // 2. Upload Files
      setLoadingStatus('Uploading video and documents...');
      
      const [videoUrl, cvUrl] = await Promise.all([
        uploadInterviewVideo(session.videoBlob),
        uploadCV(pdfBlob)
      ]);
      
      if (!videoUrl || !cvUrl) {
        throw new Error("Failed to get URLs after upload.");
      }

      setLoadingStatus('Saving candidate profile to database...');

      // 3. Save Database Record
      await saveInterviewData(finalAnalysis, videoUrl, cvUrl);

      // Update local state
      setSession(prev => ({ ...prev, analysis: finalAnalysis }));
      setFinalCvUrl(cvUrl);
      
      setStep(AppStep.SUCCESS);
    } catch (err: any) {
      console.error("Save failed:", err);
      setError(err.message || "Failed to save interview. Please check your database configuration.");
      setStep(AppStep.EDITING); // Return to edit mode on failure
    } finally {
      setLoadingStatus('');
    }
  };

  const resetApp = () => {
    setSession({ videoBlob: null, videoUrl: null, analysis: null });
    setFinalCvUrl(null);
    setStep(AppStep.LANDING);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center py-12 px-4">
      
      {/* Header */}
      <header className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg mb-4">
          <Mic className="text-white w-8 h-8" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Interview<span className="text-indigo-600">AI</span></h1>
        <p className="text-slate-500 font-medium max-w-md mx-auto">Record your 30s pitch. Let AI build your profile.</p>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-5xl">
        
        {/* Step: LANDING */}
        {step === AppStep.LANDING && (
          <div className="bg-white rounded-3xl shadow-xl p-12 text-center max-w-2xl mx-auto border border-slate-100">
            <div className="space-y-6">
              <div className="bg-indigo-50 rounded-2xl p-8 mb-8">
                <h3 className="text-lg font-bold text-indigo-900 mb-4">How it works</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-indigo-200 rounded-full flex items-center justify-center text-indigo-700 font-bold mb-2">1</div>
                    <p className="text-sm text-indigo-800">Record Video</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-indigo-200 rounded-full flex items-center justify-center text-indigo-700 font-bold mb-2">2</div>
                    <p className="text-sm text-indigo-800">AI Analysis</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-indigo-200 rounded-full flex items-center justify-center text-indigo-700 font-bold mb-2">3</div>
                    <p className="text-sm text-indigo-800">Get CV & Save</p>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setStep(AppStep.RECORDING)}
                className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-indigo-600 font-lg rounded-full hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-1 focus:outline-none ring-offset-2 focus:ring-2 ring-indigo-500"
              >
                Start Interview
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* Step: RECORDING */}
        {step === AppStep.RECORDING && (
          <div className="animate-fade-in">
            <Recorder onRecordingComplete={handleRecordingComplete} />
            <div className="text-center mt-6">
                <button 
                    onClick={() => setStep(AppStep.LANDING)}
                    className="text-slate-500 hover:text-slate-800 font-medium"
                >
                    Cancel
                </button>
            </div>
          </div>
        )}

        {/* Step: REVIEW */}
        {step === AppStep.REVIEW && session.videoUrl && (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-3xl shadow-xl animate-fade-in">
            <h2 className="text-2xl font-bold mb-4 text-center text-slate-800">Review Video</h2>
            <div className="aspect-video rounded-xl overflow-hidden bg-black shadow-inner mb-6">
              <video src={session.videoUrl} controls className="w-full h-full" />
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-center text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setStep(AppStep.RECORDING)}
                className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
              >
                <RefreshCw size={20} />
                Retake
              </button>
              <button 
                onClick={handleAnalyze}
                className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors"
              >
                <BrainCircuit size={20} />
                Analyze with AI
              </button>
            </div>
          </div>
        )}

        {/* Step: ANALYZING */}
        {step === AppStep.ANALYZING && (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 animate-ping"></div>
              <Loader2 className="w-16 h-16 text-indigo-600 animate-spin relative z-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mt-8">AI is analyzing your interview...</h2>
            <p className="text-slate-500 mt-2">Extracting transcript, skills, and professional summary.</p>
          </div>
        )}

        {/* Step: EDITING */}
        {step === AppStep.EDITING && session.analysis && (
          <>
            {error && (
                <div className="max-w-4xl mx-auto mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-center font-medium shadow-sm">
                  {error}
                </div>
            )}
            <Editor 
              initialData={session.analysis}
              onSave={handleSave}
              onCancel={() => setStep(AppStep.REVIEW)}
            />
          </>
        )}

        {/* Step: SAVING */}
        {step === AppStep.SAVING && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative mb-6">
               <Database className="w-16 h-16 text-emerald-500 animate-bounce" />
               <FileText className="w-8 h-8 text-indigo-600 absolute -bottom-2 -right-2" />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800">Creating Your Profile...</h2>
            <p className="text-slate-500 mt-2 font-medium">{loadingStatus}</p>
          </div>
        )}

        {/* Step: SUCCESS */}
        {step === AppStep.SUCCESS && (
          <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-2xl p-12 text-center border border-emerald-100">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">Success!</h2>
            <p className="text-slate-500 mb-8">Your video and AI-generated CV have been saved.</p>
            
            <div className="bg-slate-50 p-6 rounded-xl text-left mb-8 border border-slate-200">
              <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Summary</h4>
              <p className="text-slate-700 italic">"{session.analysis?.professionalSummary}"</p>
            </div>
            
            <div className="space-y-3">
                {finalCvUrl && (
                    <a 
                        href={finalCvUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                    >
                        <Download size={20} />
                        Download Generated CV (PDF)
                    </a>
                )}

                <button 
                onClick={resetApp}
                className="w-full py-4 rounded-xl bg-white border-2 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                >
                Start New Interview
                </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}