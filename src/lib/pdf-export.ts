import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Convert a lab() or oklch() color string to an rgb() string.
 * Uses a temporary canvas element to let the browser do the conversion.
 */
function convertColorToRgb(colorStr: string): string {
  // Use OffscreenCanvas or a temporary element to resolve the color
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return colorStr;

  try {
    ctx.fillStyle = colorStr;
    const resolved = ctx.fillStyle; // Browser normalizes to #hex or rgb()
    return resolved;
  } catch {
    return colorStr;
  }
}

/**
 * Check if a string contains lab() or oklch() color functions
 */
function hasUnsupportedColor(value: string): boolean {
  return /(?:lab|oklch|oklab|lch|color\()\s*\(/.test(value);
}

/**
 * Walk all elements in a document/element and replace any
 * lab()/oklch() color values in inline styles with rgb() equivalents.
 * Also process stylesheet rules that are inline.
 */
function fixUnsupportedColors(root: HTMLElement | Document) {
  const allElements = root.querySelectorAll('*');

  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const computed = window.getComputedStyle(htmlEl);

    // Check key style properties that commonly contain colors
    const colorProps = [
      'color', 'background-color', 'border-color',
      'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
      'outline-color', 'text-decoration-color', 'box-shadow', 'text-shadow',
      'fill', 'stroke', 'border-block-start-color', 'border-block-end-color',
      'border-inline-start-color', 'border-inline-end-color',
      'column-rule-color', 'caret-color',
    ];

    for (const prop of colorProps) {
      const value = computed.getPropertyValue(prop);
      if (value && hasUnsupportedColor(value)) {
        const rgb = convertColorToRgb(value);
        htmlEl.style.setProperty(prop, rgb);
      }
    }

    // Also handle background (shorthand) if it contains gradients with lab/oklch
    const bg = computed.getPropertyValue('background-image');
    if (bg && hasUnsupportedColor(bg)) {
      // Replace lab/oklch in gradients by converting each color stop
      const fixed = bg.replace(/(?:lab|oklch|oklab|lch)\s*\([^)]+\)/g, (match) => {
        return convertColorToRgb(match);
      });
      htmlEl.style.setProperty('background-image', fixed);
    }
  });

  // Also fix CSS custom properties on :root
  const rootEl = root.querySelector(':root') || (root instanceof Document ? root.documentElement : null);
  if (rootEl) {
    const computed = window.getComputedStyle(rootEl);
    // Iterate all custom properties
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i];
      if (prop.startsWith('--')) {
        const value = computed.getPropertyValue(prop);
        if (value && hasUnsupportedColor(value)) {
          const rgb = convertColorToRgb(value);
          (rootEl as HTMLElement).style.setProperty(prop, rgb);
        }
      }
    }
  }
}

/**
 * Export to PDF with full layout (charts + dimension details).
 * Uses html2canvas onclone to fix lab/oklch colors before rendering.
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

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    onclone: (_doc: Document, element: HTMLElement) => {
      // Fix unsupported color functions in the cloned DOM
      fixUnsupportedColors(element);
    },
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');

  const imgWidth = 210;
  const pageHeight = 297;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}

/**
 * Original export function (kept for backward compatibility)
 */
export async function exportToPdf(
  containerId: string,
  filename: string
): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error('Container not found');
  }

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');

  const imgWidth = 210;
  const pageHeight = 297;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}
