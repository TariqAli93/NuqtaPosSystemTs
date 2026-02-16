// src/stores/layout.ts
import { defineStore } from 'pinia';

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export const useLayoutStore = defineStore('layout', {
  state: () => ({
    drawerWidth: Number(localStorage.getItem('drawerWidth')) || 300,
  }),
  actions: {
    setDrawerWidth(width: number) {
      const w = clamp(Math.round(width), 300, 450); // عدّل الحدود مثل ما تريد
      this.drawerWidth = w;
      localStorage.setItem('drawerWidth', String(w));
    },
  },
});
