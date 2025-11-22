import { createClient } from '@supabase/supabase-js';
import { AnalysisResult } from '../types';

// Configuration
// Using the Project URL and Anon Key (JWT) provided.
// These will fallback to the hardcoded values if environment variables are not set.
const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://hnvchonvhwcpskzhzlcc.supabase.co').trim();
const SUPABASE_KEY = (process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhudmNob252aHdjcHNremh6bGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjM2OTUsImV4cCI6MjA3OTM5OTY5NX0.JX40EVqMOrKAO40Tn31ciygigQyKw9aJdCWAScw9lkA').trim();

// Initialize client
// We check for missing keys to provide helpful errors, but initialize with what we have to avoid load-time crashes.
export const supabase = createClient(
  SUPABASE_URL, 
  SUPABASE_KEY || 'MISSING_KEY_PLACEHOLDER'
);

const validateConfig = () => {
  if (!SUPABASE_KEY || SUPABASE_KEY === 'MISSING_KEY_PLACEHOLDER') {
    throw new Error("Supabase API Key is missing. Please set process.env.SUPABASE_KEY or update the service file.");
  }
  // Check for common mistake of using a Personal Access Token (sbp_...) instead of Anon Key (JWT)
  if (SUPABASE_KEY.startsWith('sbp_')) {
    throw new Error("Configuration Error: You are using a Personal Access Token (starts with 'sbp_'). Please use the 'anon' public key (starts with 'eyJ...') found in Supabase Project Settings > API.");
  }
};

export const uploadFileToStorage = async (fileBlob: Blob, folder: 'videos' | 'documents', extension: string): Promise<string> => {
  validateConfig();

  try {
    // We use a single bucket 'videos' as defined in the initial SQL, but prefix files with their type.
    const filename = `${folder}_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
    
    const { data, error } = await supabase.storage
      .from('videos') 
      .upload(filename, fileBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: extension === 'pdf' ? 'application/pdf' : 'video/webm'
      });

    if (error) {
      console.error('Supabase Storage Error:', error);
      
      // Handle specific auth errors
      if (error.message.includes("JWS") || error.statusCode === '401') {
        throw new Error("Authentication Failed: Invalid API Key. Please check your Supabase credentials.");
      }
      
      if (error.message.includes("bucket not found")) {
        throw new Error("Storage bucket 'videos' does not exist. Please run the SQL setup script.");
      }
      
      throw new Error(`${folder} Upload Failed: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(filename);

    return publicUrl;
  } catch (error: any) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

export const uploadInterviewVideo = async (videoBlob: Blob): Promise<string> => {
  return uploadFileToStorage(videoBlob, 'videos', 'webm');
};

export const uploadCV = async (pdfBlob: Blob): Promise<string> => {
  return uploadFileToStorage(pdfBlob, 'documents', 'pdf');
};

export const saveInterviewData = async (analysis: AnalysisResult, videoUrl: string, cvUrl: string) => {
  validateConfig();

  try {
    const { data, error } = await supabase
      .from('interviews')
      .insert([
        {
          candidate_name: analysis.candidateName,
          professional_summary: analysis.professionalSummary,
          transcript: analysis.transcript,
          hard_skills: analysis.hardSkills,
          soft_skills: analysis.softSkills,
          tags: analysis.tags,
          video_url: videoUrl,
          cv_url: cvUrl
        }
      ])
      .select();

    if (error) {
      console.error('Supabase Database Error:', error);
      
      if (error.message.includes("JWS") || error.code === 'PGRST301') {
         throw new Error("Authentication Failed: Invalid API Key.");
      }
      
      if (error.code === '42P01') {
        throw new Error("Table 'interviews' does not exist. Please run the SQL setup script.");
      }
      
      throw new Error(`Database Save Failed: ${error.message}`);
    }

    return data;
  } catch (error: any) {
    console.error('Error saving interview data:', error);
    throw error;
  }
};