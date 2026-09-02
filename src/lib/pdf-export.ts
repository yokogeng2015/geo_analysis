import html2canvas from 'html2canvas';

/**
 * Convert lab() color to approximate RGB
 * lab(L, a, b) -> rgb(r, g, b)
 */
function labToRgb(l: number, a: number, b: number): { r: number; g: number; bl: number } {
  const fy = (l + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;

  const delta = 6 / 29;

  const xr = fx > delta ? fx * fx * fx : (fx - 16 / 116) * 3 * delta * delta;
  const yr = fy > delta ? fy * fy * fy : (fy - 16 / 116) * 3 * delta * delta;
  const zr = fz > delta ? fz * fz * fz : (fz - 16 / 116) * 3 * delta * delta;

  const Xn = 0.95047;
  const Yn = 1.0;
  const Zn = 1.08883;

  const X = xr * Xn;
  const Y = yr * Yn;
  const Z = zr * Zn;

  let r = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
  let g = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
  let bl = X * 0.0557 + Y * -0.2040 + Z * 1.0570;

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
 * Convert oklch() color to approximate RGB
 */
function oklchToRgb(l: number, c: number, h: number): { r: number; g: number; bl: number } {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  return labToRgb(l * 100, a * 100, b * 100);
}

/**
 * Convert color function string to rgb()
 */
function convertColor(match: string): string {
  // lab(L a b) or lab(L, a, b)
  const labMatch = match.match(/lab\(\s*([\d.]+)%?\s+([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (labMatch) {
    const l = parseFloat(labMatch[1]);
    const a = parseFloat(labMatch[2]);
    const b = parseFloat(labMatch[3]);
    const rgb = labToRgb(l, a, b);
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.bl})`;
  }

  // oklch(L C H) or oklch(L, C, H)
  const oklchMatch = match.match(/oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)\s*\)/i);
  if (oklchMatch) {
    const l = parseFloat(oklchMatch[1]);
    const c = parseFloat(oklchMatch[2]);
    const h = parseFloat(oklchMatch[3]);
    const rgb = oklchToRgb(l, c, h);
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.bl})`;
  }

  return match;
}

/**
 * Sanitize colors in cloned element - replace lab()/oklch() with rgb()
 */
function sanitizeColors(element: HTMLElement): void {
  const allElements = element.querySelectorAll('*');
  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const style = htmlEl.style;
    const cssText = style.cssText;

    if (cssText && /(?:lab|oklch)\(/i.test(cssText)) {
      const sanitized = cssText.replace(/(?:lab|oklch)\([^)]*\)/gi, convertColor);
      style.cssText = sanitized;
    }
  });
}

/**
 * Export element as PNG image
 */
export async function exportAsImage(
  elementId: string,
  filename: string = 'geo-analysis'
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  // Clone the element to avoid modifying the original
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  clone.style.width = element.offsetWidth + 'px';
  document.body.appendChild(clone);

  try {
    // Sanitize colors
    sanitizeColors(clone);

    // Capture as canvas
    const canvas = await html2canvas(clone, {
      scale: 2, // Higher quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // Convert to blob and download
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/png');
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.png`;
    link.click();
    URL.revokeObjectURL(url);
  } finally {
    // Clean up clone
    document.body.removeChild(clone);
  }
}
