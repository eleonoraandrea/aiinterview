export enum AppStep {
  LANDING = 'LANDING',
  RECORDING = 'RECORDING',
  REVIEW = 'REVIEW',
  ANALYZING = 'ANALYZING',
  EDITING = 'EDITING',
  SAVING = 'SAVING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface AnalysisResult {
  transcript: string;
  candidateName: string;
  professionalSummary: string;
  hardSkills: string[];
  softSkills: string[];
  tags: string[];
}

export interface InterviewSession {
  videoBlob: Blob | null;
  videoUrl: string | null;
  analysis: AnalysisResult | null;
}
