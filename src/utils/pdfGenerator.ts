import { jsPDF } from "jspdf";

export interface TopperMaterial {
  longNotes: string[];
  shortNotes: string[];
  formulas: string[];
  pyqs: { question: string; answer: string; year: string }[];
  practiceQuestions: string[];
}

export function generateTopperNotesPDF(
  grade: string,
  subject: string,
  chapterNumber: number,
  chapterTitle: string,
  material: TopperMaterial
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  let y = 20;

  function drawPageBorder() {
    // Draw an elegant double border representing topper notebooks
    doc.setDrawColor(79, 70, 229); // indigo-600
    doc.setLineWidth(0.5);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
    
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.2);
    doc.rect(11, 11, pageWidth - 22, pageHeight - 22);

    // Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("StudyMate CBSE Toppers Library - Premium Handwritten Revision System", margin, pageHeight - 13);
    const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
    doc.text(`Page ${pageNum}`, pageWidth - margin - 15, pageHeight - 13);
  }

  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > pageHeight - 22) {
      doc.addPage();
      drawPageBorder();
      y = 25;
    }
  }

  // Cover / First Page Border
  drawPageBorder();

  // Title Banner
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(margin, y, contentWidth, 22, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("CBSE BOARD EXAM MASTER REVISION SERIES", margin + 8, y + 8);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Official Topper's Standard Notes • ${grade} • ${subject}`, margin + 8, y + 15);
  
  y += 32;

  // Chapter Header
  doc.setTextColor(30, 41, 59); // slate-800
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(`Chapter ${chapterNumber}: ${chapterTitle}`, margin, y);
  y += 10;

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Section 1: Detailed Notes
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("I. COMPREHENSIVE REVISION THEORY", margin, y);
  y += 7;

  doc.setTextColor(51, 65, 85); // slate-700
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  material.longNotes.forEach((noteText, idx) => {
    const wrappedText = doc.splitTextToSize(`${idx + 1}. ${noteText}`, contentWidth);
    const textHeight = wrappedText.length * 4.5;
    checkPageBreak(textHeight + 10);
    
    // Draw subtle note box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(margin - 2, y - 4, contentWidth + 4, textHeight + 6, "F");
    
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text(wrappedText, margin, y);
    y += textHeight + 8;
  });

  // Section 2: Formulas
  checkPageBreak(30);
  doc.setTextColor(79, 70, 229);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("II. KEY FORMULAS & HIGH-PRIORITY CONCEPT INDEX", margin, y);
  y += 7;

  material.formulas.forEach((formula, idx) => {
    const wrappedFormula = doc.splitTextToSize(`[Key Concept ${idx + 1}] ${formula}`, contentWidth);
    const textHeight = wrappedFormula.length * 4.5;
    checkPageBreak(textHeight + 6);

    doc.setFillColor(239, 246, 255); // blue-50
    doc.rect(margin - 2, y - 4, contentWidth + 4, textHeight + 6, "F");
    doc.setDrawColor(191, 219, 254); // blue-200
    doc.setLineWidth(0.4);
    doc.line(margin - 2, y - 4, margin - 2, y + textHeight + 2); // vertical left border

    doc.setTextColor(30, 58, 138); // blue-900
    doc.setFont("helvetica", "bold");
    doc.text(wrappedFormula, margin, y);
    y += textHeight + 6;
  });

  y += 5;

  // Section 3: PYQs
  checkPageBreak(40);
  doc.setTextColor(79, 70, 229);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("III. SOLVED PREVIOUS YEAR BOARD QUESTIONS (PYQs)", margin, y);
  y += 7;

  material.pyqs.forEach((pyq, idx) => {
    const qText = doc.splitTextToSize(`Q${idx + 1}. [CBSE Board ${pyq.year}] ${pyq.question}`, contentWidth);
    const aText = doc.splitTextToSize(`Model Answer: ${pyq.answer}`, contentWidth);
    const neededH = (qText.length + aText.length) * 4.5 + 15;
    
    checkPageBreak(neededH);

    // Question box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.rect(margin - 2, y - 4, contentWidth + 4, neededH - 5);

    // Question Text (bold)
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(qText, margin, y);
    y += qText.length * 4.5 + 3;

    // Answer Text (regular)
    doc.setFont("helvetica", "normal");
    doc.setTextColor(16, 185, 129); // emerald-600
    doc.text("Correct Board Answer Method:", margin, y);
    y += 4;

    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(aText, margin, y);
    y += aText.length * 4.5 + 8;
  });

  // Section 4: Self Practice & Advice
  checkPageBreak(30);
  doc.setTextColor(79, 70, 229);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("IV. TOPPER'S PRACTICE CHALLENGES", margin, y);
  y += 7;

  material.practiceQuestions.forEach((pq, idx) => {
    const wrappedPQ = doc.splitTextToSize(`Challenge ${idx + 1}: ${pq}`, contentWidth);
    const textHeight = wrappedPQ.length * 4.5;
    checkPageBreak(textHeight + 6);

    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "normal");
    doc.text(wrappedPQ, margin, y);
    y += textHeight + 4;
  });

  // Save the built PDF
  const safeTitle = chapterTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  doc.save(`${safeTitle}_toppers_notes.pdf`);
}
