// Optimize an image file for web: downscale to maxWidth and re-encode to keep
// the output under ~maxBytes while preserving aspect ratio. Returns a File
// ready to upload. Used by the White Label hero image upload.
export async function optimizeImage(file, { maxWidth = 1920, maxBytes = 400 * 1024 } = {}) {
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const scale = img.width > maxWidth ? maxWidth / img.width : 1;
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  const tryEncode = (type, q) => new Promise((resolve) => canvas.toBlob(resolve, type, q));
  // Prefer WebP (better compression); fall back to JPEG. Reduce quality step by
  // step until the output fits under maxBytes.
  const formats = [
    { type: 'image/webp', ext: 'webp' },
    { type: 'image/jpeg', ext: 'jpg' }
  ];
  for (const f of formats) {
    let q = 0.85;
    while (q >= 0.4) {
      const blob = await tryEncode(f.type, q);
      if (blob && blob.size <= maxBytes) {
        return new File([blob], replaceExt(file.name, f.ext), { type: f.type });
      }
      q -= 0.1;
    }
  }
  // Could not fit under maxBytes at any quality — return the smallest JPEG.
  const blob = await tryEncode('image/jpeg', 0.4);
  return new File([blob], replaceExt(file.name, 'jpg'), { type: 'image/jpeg' });
}

function replaceExt(name, ext) {
  return String(name).replace(/\.(jpe?g|png|webp)$/i, '') + '.' + ext;
}