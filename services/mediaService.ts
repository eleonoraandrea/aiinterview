import { jsPDF } from "jspdf";
import { AnalysisResult } from "../types";

/**
 * Captures a video frame at a specific timestamp to use as a profile photo.
 * Includes a timeout to prevent hanging if video metadata fails to load.
 */
export const captureVideoFrame = (videoUrl: string, timestamp: number = 1.0): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true; // Important for mobile support
    video.src = videoUrl;
    
    // Timeout safety valve (3 seconds)
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Video frame capture timed out"));
    }, 3000);

    const cleanup = () => {
      clearTimeout(timeoutId);
      video.onloadedmetadata = null;
      video.onseeked = null;
      video.onerror = null;
      video.removeAttribute('src');
      video.load();
    };

    // Wait for metadata to load before setting time
    video.onloadedmetadata = () => {
      // If video is shorter than requested timestamp, take the middle
      if (video.duration < timestamp) {
        video.currentTime = video.duration / 2;
      } else {
        video.currentTime = timestamp;
      }
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error("Could not get canvas context");
        }
        
        // Draw video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64 jpeg
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        cleanup();
        resolve(dataUrl);
      } catch (e) {
        cleanup();
        reject(e);
      }
    };

    video.onerror = (e) => {
      cleanup();
      reject(new Error("Video loading failed"));
    };
    
    // Explicitly load
    video.load();
  });
};

/**
 * Generates a PDF CV using jsPDF.
 */
export const generatePDFCV = (analysis: AnalysisResult, photoDataUrl: string | null): Blob => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // --- Header Section ---
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(analysis.candidateName || "Candidate Profile", margin, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("AI-Generated Video Interview Profile", margin, 28);

  // --- Photo ---
  if (photoDataUrl) {
    const imgWidth = 35;
    // Use 16:9 aspect ratio to match video capture (width * 9/16)
    const imgHeight = imgWidth * (9/16); 
    
    // Draw circle background (decorative)
    doc.setFillColor(255, 255, 255);
    doc.circle(pageWidth - margin - (imgWidth/2), 20, (imgWidth/2) + 2, 'F');
    
    try {
        // Correctly use imgHeight for the height parameter to prevent distortion
        doc.addImage(photoDataUrl, 'JPEG', pageWidth - margin - imgWidth, 20 - (imgHeight/2), imgWidth, imgHeight, undefined, 'FAST');
    } catch (e) {
        console.error("Error adding image to PDF", e);
    }
  }

  yPos = 50;

  // --- Professional Summary ---
  doc.setTextColor(51, 65, 85); // Slate 700
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Professional Summary", margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  const summaryLines = doc.splitTextToSize(analysis.professionalSummary, contentWidth);
  doc.text(summaryLines, margin, yPos);
  yPos += (summaryLines.length * 5) + 10;

  // --- Skills Grid ---
  const colWidth = contentWidth / 2;
  
  // Hard Skills
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Hard Skills", margin, yPos);
  
  // Soft Skills
  doc.text("Soft Skills", margin + colWidth, yPos);
  yPos += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  const maxItems = Math.max(analysis.hardSkills.length, analysis.softSkills.length);
  
  for(let i=0; i<maxItems; i++) {
    if(analysis.hardSkills[i]) {
        doc.text(`• ${analysis.hardSkills[i]}`, margin, yPos + (i*5));
    }
    if(analysis.softSkills[i]) {
        doc.text(`• ${analysis.softSkills[i]}`, margin + colWidth, yPos + (i*5));
    }
  }
  yPos += (maxItems * 5) + 10;

  // --- Tags ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Tags", margin, yPos);
  yPos += 6;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(79, 70, 229); // Indigo
  const tagString = analysis.tags.map(t => `#${t}`).join("  ");
  doc.text(tagString, margin, yPos);
  yPos += 15;

  // --- Transcript ---
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Transcript", margin, yPos);
  yPos += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const transcriptLines = doc.splitTextToSize(analysis.transcript, contentWidth);
  
  // Check for new page
  if (yPos + (transcriptLines.length * 4) > 280) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.text(transcriptLines, margin, yPos);

  return doc.output('blob');
};