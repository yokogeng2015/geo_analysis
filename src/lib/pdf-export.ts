import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function exportToPdf(
  elementId: string,
  filename: string
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('未找到可导出的内容区域');
  }

  // Show loading state
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#f8f9fc',
    logging: false,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // A4 size in mm
  const pdfWidth = 210;
  const pdfHeight = 297;
  const margin = 10;
  const contentWidth = pdfWidth - margin * 2;

  // Calculate scale to fit width
  const scale = contentWidth / imgWidth;
  const scaledHeight = imgHeight * scale;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // If content fits in one page
  if (scaledHeight <= pdfHeight - margin * 2) {
    pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, scaledHeight);
  } else {
    // Multi-page: slice the canvas
    let position = 0;
    const pageHeight = pdfHeight - margin * 2;
    const pageHeightInCanvas = pageHeight / scale;

    while (position < imgHeight) {
      if (position > 0) {
        pdf.addPage();
      }

      const sliceHeight = Math.min(pageHeightInCanvas, imgHeight - position);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = imgWidth;
      sliceCanvas.height = sliceHeight;
      const ctx = sliceCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          canvas,
          0,
          position,
          imgWidth,
          sliceHeight,
          0,
          0,
          imgWidth,
          sliceHeight
        );
      }

      const sliceImgData = sliceCanvas.toDataURL('image/png');
      const sliceScaledHeight = sliceHeight * scale;
      pdf.addImage(sliceImgData, 'PNG', margin, margin, contentWidth, sliceScaledHeight);
      position += pageHeightInCanvas;
    }
  }

  pdf.save(filename);
}
