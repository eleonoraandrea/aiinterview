import { createClient } from '@supabase/supabase-js';
import { AnalysisResult } from '../types';

// Configuration with fallbacks to prevent initialization errors
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hnvchonvhwcpskzhzlcc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sbp_e892f8827e901e4eda837a9f9862b3102f099a59';

// Initialize client
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const uploadInterviewVideo = async (videoBlob: Blob): Promise<string | null> => {
  try {
    const filename = `interview_${Date.now()}_${Math.random().toString(36).substring(7)}.webm`;
    
    const { data, error } = await supabase.storage
      .from('videos')
      .upload(filename, videoBlob, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase Storage Error:', error);
      throw new Error(`Video Upload Failed: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(filename);

    return publicUrl;
  } catch (error: any) {
    console.error('Error uploading video:', error);
    throw error;
  }
};

export const saveInterviewData = async (analysis: AnalysisResult, videoUrl: string) => {
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
          video_url: videoUrl
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