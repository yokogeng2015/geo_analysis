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

  // Temporarily make the container visible for capture
  const originalStyle = container.getAttribute('style') || '';
  container.setAttribute('style', `${originalStyle}; opacity: 1 !important; visibility: visible !important; z-index: 10000 !important; position: fixed !important; top: 0 !important; left: 0 !important;`);

  // Wait for charts to render
  await new Promise((resolve) => setTimeout(resolve, 500));

  try {
    // Use html-to-image which leverages browser's native SVG foreignObject rendering
    const dataUrl = await toPng(container, {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
      style: {
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
  } finally {
    // Restore original styles
    container.setAttribute('style', originalStyle);
  }
}
