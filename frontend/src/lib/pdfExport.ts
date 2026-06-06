import { jsPDF } from "jspdf";
import type { Message } from "../types";

export function exportChatToPDF(sessionName: string, messages: Message[]) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin; // 180mm
  
  let y = 20;

  // Title / Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(31, 41, 55); // Dark gray
  doc.text("Chat Transcript", margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128); // Slate gray
  doc.text(`Document: ${sessionName}`, margin, y);
  y += 5;

  const dateStr = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  doc.text(`Date: ${dateStr}`, margin, y);
  y += 8;

  // Divider Line
  doc.setDrawColor(209, 213, 219); // Light gray
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Function to print text line-by-line with page breaking
  const printText = (text: string, isBold = false, indent = 0) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81); // Neutral dark

    const indentX = margin + indent;
    const maxTextWidth = contentWidth - indent;
    
    // Split text to fit the page width
    const lines = doc.splitTextToSize(text, maxTextWidth);
    
    lines.forEach((line: string) => {
      // Check for page break (giving 15mm bottom margin)
      if (y > pageHeight - 15) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, indentX, y);
      y += 5.5; // Line height
    });
  };

  messages.forEach((msg) => {
    // Spacer check
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }

    if (msg.role === "user") {
      printText("User:", true);
      printText(msg.content, false, 5);
      y += 4; // Space after message
    } else {
      printText("Assistant:", true);
      printText(msg.content, false, 5);
      y += 4;

      // Citations
      if (msg.citations && msg.citations.length > 0) {
        printText("Sources used:", true, 5);
        
        msg.citations.forEach((cite, idx) => {
          const scorePercent = (cite.score * 100).toFixed(1);
          const scoreText = `Relevance: ${scorePercent}%`;
          
          printText(`[${idx + 1}] (${scoreText})`, true, 10);
          printText(cite.chunk || "", false, 10);
          y += 2;
        });
      }
      
      // Turn Divider line
      if (y > pageHeight - 15) {
        doc.addPage();
        y = 20;
      } else {
        doc.setDrawColor(243, 244, 246);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;
      }
    }
  });

  // Footer page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: "right" });
  }

  const safeName = sessionName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  doc.save(`transcript_${safeName}.pdf`);
}
