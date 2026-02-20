/**
 * MapTiler tile configuration for Leaflet.
 *
 * Uses MapTiler raster tile endpoints with streets-v2-light / streets-v2-dark styles.
 * These are high-quality vector-backed raster tiles suitable for Leaflet without plugins.
 *
 * Env var: VITE_MAPTILER_KEY
 */

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || '';

const LIGHT_STYLE = 'streets-v4';
const DARK_STYLE = 'streets-v4-dark';

/**
 * Returns Leaflet-compatible tile URL + attribution for the current theme.
 *
 * @param {'light'|'dark'|'system'} theme — value from useTheme()
 * @returns {{ url: string, attribution: string }}
 */
export function getMapTile(theme) {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const style = isDark ? DARK_STYLE : LIGHT_STYLE;

  return {
    url: `https://api.maptiler.com/maps/${style}/256/{z}/{x}/{y}@2x.png?key=${MAPTILER_KEY}`,
    attribution:
      '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  };
}
