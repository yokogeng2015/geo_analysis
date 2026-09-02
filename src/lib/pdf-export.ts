import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Convert lab() color to approximate RGB
 * lab(L, a, b) -> rgb(r, g, b)
 * This is a simplified conversion
 */
function labToRgb(l: number, a: number, b: number): { r: number; g: number; bl: number } {
  // Normalize L to 0-100 range (CSS lab uses 0-100)
  // a and b are typically -125 to 125
  const fy = (l + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;

  const delta = 6 / 29;
  const delta3 = delta * delta * delta;

  const xr = fx > delta ? fx * fx * fx : (fx - 16 / 116) * 3 * delta * delta;
  const yr = fy > delta ? fy * fy * fy : (fy - 16 / 116) * 3 * delta * delta;
  const zr = fz > delta ? fz * fz * fz : (fz - 16 / 116) * 3 * delta * delta;

  // D65 white point
  const Xn = 0.95047;
  const Yn = 1.0;
  const Zn = 1.08883;

  const X = xr * Xn;
  const Y = yr * Yn;
  const Z = zr * Zn;

  let r = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
  let g = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
  let bl = X * 0.0557 + Y * -0.2040 + Z * 1.0570;

  // Gamma correction
  const gamma = (c: number) => c > 0.0031308 ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055 : 12.92 * c;

  r = Math.round(gamma(r) * 255);
  g = Math.round(gamma(g) * 255);
  bl = Math.round(gamma(bl) * 255);

  return {
    r: Math.max(0, Math.min(255, r)),
    g: Math.max(0, Math.min(255, g)),
    bl: Math.max(0, Math.min(255, bl)),
  };
}

/**
 * Replace unsupported CSS color functions (lab(), oklch(), etc.) with rgb()
 * in a cloned element before passing to html2canvas
 */
function sanitizeColors(element: HTMLElement): HTMLElement {
  const clone = element.cloneNode(true) as HTMLElement;

  // More comprehensive regex to match lab(), oklch(), oklab(), color() functions
  const colorRegex = /(?:lab|oklch|oklab|color)\([^)]*\)/gi;

  function convertColorToRgb(match: string): string {
    // Parse lab(L a b) or lab(L% a b)
    const labMatch = match.match(/lab\(\s*([\d.]+)%?\s+([\d.-]+)\s+([\d.-]+)\s*\)/i);
    if (labMatch) {
      const l = parseFloat(labMatch[1]);
      const a = parseFloat(labMatch[2]);
      const b = parseFloat(labMatch[3]);
      const rgb = labToRgb(l, a, b);
      return `rgb(${rgb.r}, ${rgb.g}, ${rgb.bl})`;
    }
    // Parse oklch(L C H)
    const oklchMatch = match.match(/oklch\(\s*([\d.]+)%?\s+([\d.-]+)\s+([\d.-]+)\s*\)/i);
    if (oklchMatch) {
      // Simplified: just return a neutral gray as fallback
      return 'rgb(128, 128, 128)';
    }
    // Parse oklab(L a b)
    const oklabMatch = match.match(/oklab\(\s*([\d.]+)%?\s+([\d.-]+)\s+([\d.-]+)\s*\)/i);
    if (oklabMatch) {
      // Simplified: just return a neutral gray as fallback
      return 'rgb(128, 128, 128)';
    }
    return 'rgb(0, 0, 0)';
  }

  function replaceColorsInValue(value: string): string {
    if (!value) return value;
    // Reset regex lastIndex for global regex
    colorRegex.lastIndex = 0;
    if (colorRegex.test(value)) {
      colorRegex.lastIndex = 0;
      return value.replace(colorRegex, convertColorToRgb);
    }
    return value;
  }

  function walk(el: HTMLElement): void {
    // Replace colors in inline style
    if (el.style) {
      const styleProps = Array.from(el.style);
      for (const prop of styleProps) {
        const value = el.style.getPropertyValue(prop);
        if (value && colorRegex.test(value)) {
          el.style.setProperty(prop, replaceColorsInValue(value));
        }
      }
    }

    // Also check and replace in common style attributes
    const computed = window.getComputedStyle(el);
    const propsToCheck = [
      'color', 'background-color', 'border-color',
      'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
      'outline-color', 'text-decoration-color', 'box-shadow', 'text-shadow',
      'fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color',
      'background', 'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
    ];

    for (const prop of propsToCheck) {
      const value = computed.getPropertyValue(prop);
      if (value && colorRegex.test(value)) {
        colorRegex.lastIndex = 0;
        el.style.setProperty(prop, replaceColorsInValue(value));
      }
    }

    for (const child of Array.from(el.children)) {
      walk(child as HTMLElement);
    }
  }

  walk(clone);
  return clone;
}

export async function exportToPdf(
  elementId: string,
  filename: string
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('未找到可导出的内容区域');
  }

  // Sanitize colors: replace lab()/oklch() with rgb() for html2canvas compatibility
  const sanitized = sanitizeColors(element);
  sanitized.style.position = 'absolute';
  sanitized.style.left = '-9999px';
  sanitized.style.top = '0';
  sanitized.style.width = `${element.offsetWidth}px`;
  document.body.appendChild(sanitized);

  try {
    const canvas = await html2canvas(sanitized, {
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
          ctx.drawImage(canvas, 0, position, imgWidth, sliceHeight, 0, 0, imgWidth, sliceHeight);
          const sliceImgData = sliceCanvas.toDataURL('image/png');
          pdf.addImage(sliceImgData, 'PNG', margin, margin, contentWidth, sliceHeight * scale);
        }
        position += pageHeightInCanvas;
      }
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(sanitized);
  }
}
