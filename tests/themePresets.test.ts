import assert from 'node:assert/strict';
import test from 'node:test';
import { getThemeWallpaperStyle } from '../src/domain/themePresets.ts';

test('keeps the Neo Pop pattern in valid background style properties', () => {
  const wallpaper = getThemeWallpaperStyle('neo-pop');

  assert.equal(wallpaper.backgroundColor, '#F472B6');
  assert.ok(wallpaper.backgroundImage?.includes('linear-gradient(145deg, #FDE047, #F472B6 48%, #818CF8)'));
  assert.equal(wallpaper.backgroundPosition, '-18px 0, -18px 0, 0 0');
  assert.equal(wallpaper.backgroundSize, '36px 36px, 36px 36px, auto');
  assert.doesNotMatch(wallpaper.backgroundImage || '', /\//);
});
