import { ref, computed, watch } from 'vue';
import { IpcEvent } from '@/enum/ipc-event';
import { ColorMode } from '@/types/theme';

export function useColourMode() {
  const storedMode = localStorage.getItem('color-mode') as ColorMode | null;
  const mode = ref<ColorMode>(storedMode || 'system');

  const updateHtmlAttributes = (newMode: ColorMode) => {
    const finalMode = newMode === 'system' ? getSystemTheme() : newMode;
    document.documentElement.setAttribute('data-theme', finalMode);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(finalMode);
  };

  const getSystemTheme = (): ColorMode => {
    return window.electron.getSystemTheme() as ColorMode;
  };

  const toggleMode = () => {
    // Toggle between light and dark if in 'system' mode
    if (mode.value === 'system') {
      mode.value = getSystemTheme() === 'dark' ? 'light' : 'dark';
    } else {
      mode.value = mode.value === 'light' ? 'dark' : 'light';
    }
    updateHtmlAttributes(mode.value);
    window.electron.send(IpcEvent.SET_NATIVE_THEME, mode.value);
    localStorage.setItem('color-mode', mode.value);
  };

  const handleColorModeChange = () => {
    if (mode.value === 'system') {
      // Listen for system theme changes and apply the correct theme
      window.electron.on(IpcEvent.NATIVE_THEME_UPDATED, (_event, newTheme: ColorMode) => {
        updateHtmlAttributes(newTheme);
      });
      updateHtmlAttributes('system');
    } else {
      updateHtmlAttributes(mode.value);
    }
  };

  watch(mode, (newMode) => {
    localStorage.setItem('color-mode', newMode);
    window.electron.send(IpcEvent.SET_NATIVE_THEME, newMode);
    updateHtmlAttributes(newMode);
  });

  return {
    mode: computed(() => mode.value),
    toggleMode,
    handleColorModeChange,
  };
}
