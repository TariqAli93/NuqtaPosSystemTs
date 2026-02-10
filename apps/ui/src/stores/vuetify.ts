import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useTheme } from 'vuetify';

export const useVuetifyStore = defineStore('vuetify', () => {
  const vuetifyTheme = useTheme();
  const theme = ref(localStorage.getItem('vuetify-theme') || 'dark');

  const toggleTheme = () => {
    vuetifyTheme.toggle();
    theme.value = vuetifyTheme.global.name.value;

    localStorage.setItem('vuetify-theme', theme.value);
  };

  return { theme, toggleTheme };
});
