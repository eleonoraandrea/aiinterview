import { createClient } from '@supabase/supabase-js';
import { AnalysisResult } from '../types';

// Configuration with fallbacks to prevent initialization errors
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hnvchonvhwcpskzhzlcc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sbp_e892f8827e901e4eda837a9f9862b3102f099a59';

// Initialize client
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const uploadFileToStorage = async (fileBlob: Blob, folder: 'videos' | 'documents', extension: string): Promise<string> => {
  try {
    // We use the 'videos' bucket for everything to keep it simple, or ensure 'documents' exists.
    // For this prompt, we will store everything in the 'videos' bucket but organize by name if possible,
    // or just dump them there.
    const filename = `${folder}_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
    
    const { data, error } = await supabase.storage
      .from('videos') // Reusing the videos bucket for simplicity as setup in SQL
      .upload(filename, fileBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: extension === 'pdf' ? 'application/pdf' : 'video/webm'
      });

    if (error) {
      console.error('Supabase Storage Error:', error);
      throw new Error(`${folder} Upload Failed: ${error.message}`);
    }

    // Get public URL
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
      throw new Error(`Database Save Failed: ${error.message}`);
    }

    return data;
  } catch (error: any) {
    console.error('Error saving interview data:', error);
    throw error;
  }
};