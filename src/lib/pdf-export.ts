import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

/**
 * Export to PDF using html-to-image (browser native SVG foreignObject rendering).
 * No lab/oklch color issues - fully supports modern CSS including Tailwind v4.
 */
export async function exportToPdfWithCharts(
  containerId: string,
  filename: string,
  _technicalChart?: unknown,
  _contentChart?: unknown
): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error('Container not found');
  }

  // Use html-to-image which leverages browser's native SVG foreignObject rendering
  // This completely bypasses the lab/oklch color parsing issues of html2canvas
  const dataUrl = await toPng(container, {
    quality: 1,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    cacheBust: true,
    style: {
      // Ensure the container is fully visible for rendering
      transform: 'none',
    },
  });

  const pdf = new jsPDF('p', 'mm', 'a4');

  const imgWidth = 210;
  const pageHeight = 297;

  // Get image dimensions to calculate height
  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
  });

  const imgHeight = (img.height * imgWidth) / img.width;
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}
