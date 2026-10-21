/**
 * 客户端图片处理工具：读取 File 为 dataURI，大图自动压缩。
 * 供文案优化截图提取、优化代码直接识图等场景复用。
 */

const COMPRESS_THRESHOLD = 1.5 * 1024 * 1024; // 超过 1.5MB 才压缩
const MAX_EDGE = 2000; // 压缩后最长边

/** 读取文件为 dataURI；超过 1.5MB 时用 canvas 压到最长边 2000px（JPEG 90%）再返回 */
export async function fileToCompressedDataUri(file: File): Promise<string> {
  const readAsDataUri = () =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('读取图片失败'));
      reader.readAsDataURL(file);
    });

  if (file.size <= COMPRESS_THRESHOLD) return readAsDataUri();

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('图片解析失败'));
      el.src = objectUrl;
    });
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return readAsDataUri();
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
