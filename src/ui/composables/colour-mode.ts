import { ref, computed, watch } from 'vue';

export type ColorMode = 'light' | 'dark';

/**
 * A composable function to manage the colour mode of the application.
 *
 * @returns An object with the current colour mode and a function to toggle it.
 */
export function useColourMode() {
  const storedMode = localStorage.getItem('color-mode') as ColorMode | null;
  const mode = ref<ColorMode>(storedMode || 'light');

  const updateHtmlAttributes = (newMode: ColorMode) => {
    document.documentElement.setAttribute('data-theme', newMode);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newMode);
  };

  const toggleMode = () => {
    mode.value = mode.value === 'light' ? 'dark' : 'light';
    updateHtmlAttributes(mode.value);
    localStorage.setItem('color-mode', mode.value);
  };

  watch(mode, (newMode) => {
    updateHtmlAttributes(newMode);
    localStorage.setItem('color-mode', newMode);
  }, { immediate: true });

  return {
    mode: computed(() => mode.value),
    toggleMode,
  };
}
