import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

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
  employerFeedback?: string;
  institutionFeedback?: string;
}

export const generateLogbookPDF = (data: LogbookReportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const brandColor: [number, number, number] = [26, 184, 170]; // #1ab8aa Teal
  const darkColor: [number, number, number] = [17, 24, 39];    // #111827
  const grayColor: [number, number, number] = [107, 114, 128]; // #6b7280

  // --- Header ---
  doc.setFontSize(24);
  doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('EDULINK', 14, 22);
  
  doc.setFontSize(14);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('Professional Logbook Report', pageWidth - 14, 22, { align: 'right' });
  
  doc.setFontSize(9);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text(`Generated on ${format(new Date(), 'PPP p')}`, pageWidth - 14, 28, { align: 'right' });
  
  // Horizontal Line
  doc.setDrawColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.setLineWidth(1);
  doc.line(14, 35, pageWidth - 14, 35);

  // --- Info Card Section ---
  doc.setFillColor(249, 250, 251);
  doc.rect(14, 45, pageWidth - 28, 55, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.rect(14, 45, pageWidth - 28, 55, 'S');

  doc.setFontSize(10);
  doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('INTERNSHIP ENGAGEMENT DETAILS', 20, 54);
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.2);
  doc.line(20, 57, pageWidth - 20, 57);

  const leftCol = 20;
  const rightCol = pageWidth / 2 + 5;
  
  // Row 1
  doc.setFontSize(8);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('STUDENT PROFESSIONAL', leftCol, 66);
  doc.text('PLACEMENT POSITION', rightCol, 66);
  
  doc.setFontSize(11);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text(data.studentName, leftCol, 72);
  doc.text(data.internshipTitle, rightCol, 72);

  // Row 2
  doc.setFontSize(8);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('HOST ORGANIZATION', leftCol, 82);
  doc.text('WEEK START DATE', rightCol, 82);
  
  doc.setFontSize(11);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text(data.employerName, leftCol, 88);
  doc.text(data.weekStartDate, rightCol, 88);

  // --- Log Entries Section ---
  doc.setFontSize(14);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('Weekly Logbook Entry', 14, 115);
  doc.setDrawColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.setLineWidth(1.5);
  doc.line(14, 110, 14, 118);

  const tableData = Object.entries(data.entries)
    .sort()
    .map(([date, content]) => [
      format(new Date(date), 'EEEE, MMM d'),
      content
    ]);

  autoTable(doc, {
    startY: 125,
    head: [['DATE', 'ACTIVITIES & LEARNING OUTCOMES']],
    body: tableData,
    headStyles: { 
      fillColor: brandColor, 
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold'
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold', textColor: grayColor },
      1: { cellWidth: 'auto', textColor: darkColor }
    },
    margin: { left: 14, right: 14 },
    theme: 'striped'
  });

  const finalY = (doc as any).lastAutoTable.finalY || 150;

  // --- Feedback Sections ---
  if (data.employerFeedback) {
    doc.setFillColor(240, 253, 250);
    doc.rect(14, finalY + 10, pageWidth - 28, 20, 'F');
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
    const feedbackOffset = data.employerFeedback ? 35 : 10;
    doc.setFillColor(239, 246, 255); // #eff6ff
    doc.rect(14, finalY + feedbackOffset, pageWidth - 28, 20, 'F');
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

  // --- Footer ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `This is an official document generated by the Edulink Professional Platform.`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
  }

  const fileName = `EduLink_Logbook_${data.studentName.replace(/\s+/g, '_')}_${data.weekStartDate}.pdf`;
  doc.save(fileName);
};
