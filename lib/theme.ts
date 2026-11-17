export const themeKey = 'failfix.theme';
const themes = ['light', 'dark', 'mono'] as const;

export function isTheme(value: string | null): value is (typeof themes)[number] {
  return themes.some(theme => theme === value);
}

// Runs in the document head so a saved choice takes effect before the first paint.
export const themeInit = `try {
  var theme = localStorage.getItem(${JSON.stringify(themeKey)});
  if (${JSON.stringify(themes)}.includes(theme)) document.documentElement.dataset.theme = theme;
} catch {}`;
