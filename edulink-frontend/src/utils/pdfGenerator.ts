import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import {
  buildStandardDailyEntries,
  getWeekEndingDate,
} from './logbookFormat';

export interface LogbookReportData {
  studentName: string;
  studentEmail: string;
  studentReg?: string;
  internshipTitle: string;
  employerName: string;
  department?: string;
  weekStartDate: string;
  status: string;
  entries: Record<string, string>;
  weeklySummary?: string;
  employerFeedback?: string;
  institutionFeedback?: string;
}

export const generateLogbookPDF = (data: LogbookReportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const brandColor: [number, number, number] = [26, 184, 170]; // #1ab8aa Teal
  const darkColor: [number, number, number] = [17, 24, 39];    // #111827
  const grayColor: [number, number, number] = [107, 114, 128]; // #6b7280
  const weekEndingDate = getWeekEndingDate(data.weekStartDate);
  const standardEntries = buildStandardDailyEntries(data.weekStartDate, data.entries);

  // --- Header ---
  doc.setFontSize(20);
  doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('EDULINK', 14, 22);
  
  doc.setFontSize(13);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('Industrial Attachment Student Logbook', pageWidth - 14, 22, { align: 'right' });
  
  doc.setFontSize(9);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text(`Generated on ${format(new Date(), 'PPP p')}`, pageWidth - 14, 28, { align: 'right' });
  
  // Horizontal Line
  doc.setDrawColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.setLineWidth(1);
  doc.line(14, 35, pageWidth - 14, 35);

  // --- Info Card Section ---
  doc.setFillColor(249, 250, 251);
  doc.rect(14, 45, pageWidth - 28, 62, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.rect(14, 45, pageWidth - 28, 62, 'S');

  doc.setFontSize(10);
  doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('STUDENT PARTICULARS', 20, 54);
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.2);
  doc.line(20, 57, pageWidth - 20, 57);

  const leftCol = 20;
  const rightCol = pageWidth / 2 + 5;
  
  // Row 1
  doc.setFontSize(8);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('NAME OF STUDENT', leftCol, 66);
  doc.text('REGISTRATION NUMBER', rightCol, 66);
  
  doc.setFontSize(11);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text(data.studentName, leftCol, 72);
  doc.text(data.studentReg || 'N/A', rightCol, 72);

  // Row 2
  doc.setFontSize(8);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('COURSE / DEPARTMENT', leftCol, 82);
  doc.text('HOST ORGANIZATION', rightCol, 82);
  
  doc.setFontSize(11);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text(data.department || 'N/A', leftCol, 88);
  doc.text(data.employerName, rightCol, 88);

  doc.setFontSize(8);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('ATTACHMENT POSITION', leftCol, 98);
  doc.text('WEEK ENDING', rightCol, 98);
  doc.setFontSize(11);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text(data.internshipTitle, leftCol, 104);
  doc.text(weekEndingDate, rightCol, 104);

  // --- Log Entries Section ---
  doc.setFontSize(14);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('Weekly Progress Chart', 14, 122);
  doc.setDrawColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.setLineWidth(1.5);
  doc.line(14, 117, 14, 125);

  const tableData = standardEntries.map(entry => [
    entry.day,
    `${format(new Date(`${entry.date}T00:00:00`), 'MMM d')}\n${entry.description || 'No activity recorded.'}`
  ]);

  autoTable(doc, {
    startY: 132,
    head: [['DAY', 'DESCRIPTION OF WORK DONE AND NEW SKILLS LEARNT']],
    body: tableData,
    headStyles: { 
      fillColor: brandColor, 
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold'
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold', textColor: darkColor },
      1: { cellWidth: 'auto', textColor: darkColor }
    },
    margin: { left: 14, right: 14 },
    theme: 'striped'
  });

  let finalY = (doc as any).lastAutoTable.finalY || 150;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text("Trainee's Weekly Report", 14, finalY + 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  const weeklyLines = doc.splitTextToSize(data.weeklySummary || 'No weekly summary recorded.', pageWidth - 28);
  doc.text(weeklyLines, 14, finalY + 20);
  finalY += 24 + (weeklyLines.length * 5);

  doc.setDrawColor(156, 163, 175);
  doc.line(14, finalY + 10, 84, finalY + 10);
  doc.line(pageWidth - 84, finalY + 10, pageWidth - 14, finalY + 10);
  doc.setFontSize(8);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('Student Signature / Digital Confirmation', 14, finalY + 16);
  doc.text('Date', pageWidth - 84, finalY + 16);
  finalY += 18;

  // --- Feedback Sections ---
  if (data.employerFeedback) {
    doc.setFillColor(240, 253, 250);
    doc.rect(14, finalY + 10, pageWidth - 28, 24, 'F');
    doc.setFontSize(8);
    doc.setTextColor(15, 118, 110);
    doc.setFont('helvetica', 'bold');
    doc.text('EMPLOYER SUPERVISOR FEEDBACK', 20, finalY + 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(19, 78, 74);
    const employerLines = doc.splitTextToSize(data.employerFeedback, pageWidth - 40);
    doc.text(employerLines, 20, finalY + 25);
  }

  if (data.institutionFeedback) {
    const feedbackOffset = data.employerFeedback ? 40 : 10;
    doc.setFillColor(239, 246, 255); // #eff6ff
    doc.rect(14, finalY + feedbackOffset, pageWidth - 28, 24, 'F');
    doc.setFontSize(8);
    doc.setTextColor(29, 78, 216); // #1d4ed8
    doc.setFont('helvetica', 'bold');
    doc.text('INSTITUTIONAL ACADEMIC REVIEW', 20, finalY + feedbackOffset + 8);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(30, 58, 138); // #1e3a8a
    const institutionLines = doc.splitTextToSize(data.institutionFeedback, pageWidth - 40);
    doc.text(institutionLines, 20, finalY + feedbackOffset + 15);
  }

  if (!data.employerFeedback && !data.institutionFeedback) {
    doc.setFontSize(10);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text('Comments by Lecturer / Supervisor:', 14, finalY + 12);
    doc.line(62, finalY + 12, pageWidth - 14, finalY + 12);
    doc.line(14, finalY + 24, pageWidth - 14, finalY + 24);
    doc.text('Name:', 14, finalY + 38);
    doc.line(28, finalY + 38, 100, finalY + 38);
    doc.text('Signature:', 110, finalY + 38);
    doc.line(130, finalY + 38, pageWidth - 14, finalY + 38);
  }

  // --- Footer ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Industrial attachment logbook generated by the EduLink Professional Platform.`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
  }

  const fileName = `EduLink_Attachment_Logbook_${data.studentName.replace(/\s+/g, '_')}_${data.weekStartDate}.pdf`;
  doc.save(fileName);
};
