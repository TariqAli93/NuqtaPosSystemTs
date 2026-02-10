import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import '@mdi/font/css/materialdesignicons.css';
import { ar } from 'vuetify/locale';
import { fluentBlueprint } from './blueprints/fluentBlueprint';
import '../../styles/main.scss';

const lightTheme = {
  dark: false,
  colors: {
    primary: '#2563EB',
    secondary: '#475569',
    accent: '#3B82F6',
    error: '#DC2626',
    info: '#0EA5E9',
    success: '#16A34A',
    warning: '#F59E0B',
    background: '#F3F4F8',
    surface: '#FFFFFF',
  },
};

const darkTheme = {
  dark: true,
  colors: {
    primary: '#60A5FA',
    secondary: '#94A3B8',
    accent: '#93C5FD',
    error: '#F87171',
    info: '#38BDF8',
    success: '#4ADE80',
    warning: '#FBBF24',
    background: '#0F1116',
    surface: '#171A21',
    'surface-darken-1': '#1D212A',
    'surface-darken-2': '#232834',
    'surface-darken-3': '#2A3040',
    'surface-lighten-1': '#1B1F28',
    'surface-lighten-2': '#1F2430',
    'surface-lighten-3': '#232A36',
  },
};

export default createVuetify({
  components,
  directives,
  blueprint: fluentBlueprint,
  locale: {
    locale: 'ar',
    fallback: 'ar',
    messages: { ar },
    rtl: { ar: true },
  },
  defaults: {
    VCard: {
      elevation: 0,
      rounded: 'lg',
    },
    VBtn: {
      rounded: 'lg',
      height: 40,
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      rounded: 'lg',
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
      rounded: 'lg',
    },
    VTextarea: {
      variant: 'outlined',
      density: 'comfortable',
      rounded: 'lg',
    },
  },
  theme: {
    defaultTheme: localStorage.getItem('vuetify-theme') || 'dark',
    themes: {
      light: lightTheme,
      dark: darkTheme,
    },
  },
});
