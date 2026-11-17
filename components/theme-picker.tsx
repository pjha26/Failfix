'use client';

import { useEffect, useRef } from 'react';
import { themeKey, isTheme } from '@/lib/theme';

export function ThemePicker() {
  const picker = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    function sync() {
      if (picker.current) picker.current.value = document.documentElement.dataset.theme || 'system';
    }
    function syncTab(event: StorageEvent) {
      if (event.storageArea !== localStorage || (event.key !== themeKey && event.key !== null)) return;
      const choice = event.newValue;
      if (isTheme(choice)) document.documentElement.dataset.theme = choice;
      else delete document.documentElement.dataset.theme;
      sync();
    }
    sync();
    window.addEventListener('storage', syncTab);
    return () => window.removeEventListener('storage', syncTab);
  }, []);

  return (
    <label className="theme-picker">
      <span aria-hidden="true" className="theme-swatch" />
      <select aria-label="Color theme" ref={picker} defaultValue="system" onChange={event => {
        const choice = event.currentTarget.value;
        if (isTheme(choice)) document.documentElement.dataset.theme = choice;
        else delete document.documentElement.dataset.theme;
        try {
          if (isTheme(choice)) localStorage.setItem(themeKey, choice);
          else localStorage.removeItem(themeKey);
        } catch { /* The current page can still use the selected theme. */ }
      }}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="mono">Monochrome</option>
      </select>
    </label>
  );
}
