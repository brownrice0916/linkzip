const loadedFonts = new Set<string>();

const SYSTEM_FONTS = new Set([
  '', 'sans', 'serif', 'mono', 'sans-serif', 'serif', 'monospace',
  'Pretendard', 'system-ui', 'Arial',
]);

export const ensureDesignFontLoaded = (fontFamily: string | undefined) => {
  const font = fontFamily?.trim() || '';
  if (SYSTEM_FONTS.has(font) || loadedFonts.has(font) || typeof document === 'undefined') return;

  loadedFonts.add(font);
  const family = encodeURIComponent(font).replace(/%20/g, '+');
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  // Request one face only. Browsers synthesize heavier UI weights when a
  // family does not publish them, which keeps a chosen font from turning into
  // six blocking downloads on mobile.
  link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
  link.dataset.linkzipFont = font;
  document.head.appendChild(link);
};
