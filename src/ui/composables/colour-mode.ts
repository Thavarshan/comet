import { ref, computed, watch } from 'vue';

export type ColorMode = 'light' | 'dark';

/**
 * A composable function to manage the colour mode of the application.
 *
 * @returns An object with the current colour mode and a function to toggle it.
 */
export function useColourMode() {
  const mode = ref<ColorMode>('light');

  const updateHtmlAttributes = (newMode: ColorMode) => {
    document.documentElement.setAttribute('data-theme', newMode);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newMode);
  };

  const toggleMode = () => {
    mode.value = mode.value === 'light' ? 'dark' : 'light';
    updateHtmlAttributes(mode.value);
  };

  watch(mode, (newMode) => {
    updateHtmlAttributes(newMode);
  }, { immediate: true });

  return {
    mode: computed(() => mode.value),
    toggleMode,
  };
}
