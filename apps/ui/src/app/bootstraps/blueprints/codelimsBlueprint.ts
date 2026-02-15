// Vuetify 3.11.8-compatible blueprint (createVuetify options)
// Notes:
// - Removed unsupported top-level keys (typography/spacing/borderRadius/elevation/utilities/rtl)
// - Moved RTL to `locale.rtl` (Vuetify 3 way)
// - Hardened `defaultTheme` for SSR / private mode
// - Fixed a few props that were likely invalid or inconsistent (e.g., border: 'b')
// - Deduped icon aliases (`close` was defined twice)
// - Kept your design tokens, but separated them so you can use them in CSS/JS without pretending Vuetify consumes them

const getStoredTheme = (): 'light' | 'dark' => {
  try {
    const v = typeof window !== 'undefined' ? window.localStorage.getItem('vuetify-theme') : null;
    return v === 'light' || v === 'dark' ? v : 'dark';
  } catch {
    return 'dark';
  }
};

/**
 * Optional app-wide design tokens (NOT consumed by Vuetify automatically).
 * Keep these if your app references them (CSS vars, custom composables, etc.)
 */
export const codelDesignTokens = Object.freeze({
  typography: {
    fontFamily: '"Roboto", "Noto Sans Arabic", "Segoe UI", "Helvetica Neue", sans-serif',
    // If you want Vuetify to truly use these scales, do it via Sass variables OR via
    // component-level classes/`style` bindings. Vuetify 3 does not take a `typography` option.
    scales: {
      h1: { fontSize: '3.75rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 },
      h2: { fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.3 },
      h3: { fontSize: '2rem', fontWeight: 600, letterSpacing: '0', lineHeight: 1.4 },
      h4: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.4 },
      h5: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.5 },
      h6: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.5 },
      body1: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.6 },
      body2: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.5 },
    },
  },
  spacing: { base: 8, xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radii: { sm: '4px', md: '8px', lg: '12px', xl: '16px' },
  shadows: {
    none: 'none',
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 2px 8px rgba(0, 0, 0, 0.08)',
    lg: '0 4px 16px rgba(0, 0, 0, 0.1)',
    xl: '0 8px 24px rgba(0, 0, 0, 0.12)',
  },
  transitions: {
    fast: '0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    base: '0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
});

/**
 * The actual Vuetify blueprint to pass into `createVuetify(...)`.
 * Import once (single module instance) to avoid recreating defaults/themes and triggering extra work.
 */
export const codelBlueprint = Object.freeze({
  theme: {
    defaultTheme: getStoredTheme(),
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#2563EB',
          secondary: '#64748B',
          accent: '#6366F1',
          info: '#3B82F6',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          background: '#F9FAFB',
          surface: '#FFFFFF',
          'surface-variant': '#F3F4F6',
          'on-surface': '#1F2937',
          'on-background': '#111827',
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: '#3B82F6',
          secondary: '#64748B',
          accent: '#818CF8',
          info: '#60A5FA',
          success: '#34D399',
          warning: '#FBBF24',
          error: '#F87171',
          background: '#0F172A',
          surface: '#1E293B',
          'surface-variant': '#334155',
          'on-surface': '#F1F5F9',
          'on-background': '#F8FAFC',
        },
      },
    },
    // Optional: Vuetify supports theme variations; useful if you later add e.g. "surface" overlays
    // variations: { colors: ["primary", "secondary"], lighten: 1, darken: 1 },
  },

  // RTL in Vuetify 3 is driven by locale RTL mapping.
  // Mark Arabic as RTL; keep English LTR.
  locale: {
    // If you use Vuetify locale packs, set `locale`/`fallback` accordingly.
    // locale: "ar",
    // fallback: "en",
    rtl: {
      ar: true,
      en: false,
    },
  },

  // Defaults = global props for components. Keep these conservative to avoid surprises.
  defaults: {
    VBtn: {
      rounded: 'lg',
      elevation: 0,
      variant: 'flat',
      ripple: true,
      // Accessibility: ensure reasonable min height when using icon-only buttons elsewhere
      // (component-level is still best, but this helps)
      // minHeight: 40, // only if your design tolerates it
    },

    VCard: {
      rounded: 'lg',
      elevation: 0,
      border: true,
    },

    // Inputs: keep `hideDetails` to 'auto' (good), add `persistentPlaceholder` only if you need it.
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary',
      hideDetails: 'auto',
      bgColor: 'surface',
      rounded: 'lg',
      // UX: avoids layout jump when validation messages appear/disappear (optional)
      // persistentHint: true,
    },
    VTextarea: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary',
      hideDetails: 'auto',
      bgColor: 'surface',
      rounded: 'lg',
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary',
      hideDetails: 'auto',
      bgColor: 'surface',
      rounded: 'lg',
    },
    VAutocomplete: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary',
      hideDetails: 'auto',
      bgColor: 'surface',
      rounded: 'lg',
    },
    VCombobox: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary',
      hideDetails: 'auto',
      bgColor: 'surface',
      rounded: 'lg',
    },

    VChip: {
      rounded: 'lg',
      elevation: 0,
      variant: 'flat',
      size: 'small',
    },

    VDataTable: {
      hover: true,
      density: 'comfortable',
    },

    VList: {
      density: 'comfortable',
      rounded: 'lg',
      nav: true,
    },
    VListItem: {
      rounded: 'lg',
    },

    VAppBar: {
      flat: true,
      elevation: 0,
      // `border: 'b'` is not a valid Vuetify prop value. Use boolean border + class for side.
      border: true,
      class: 'border-b',
      height: 72,
      color: 'surface',
    },

    VNavigationDrawer: {
      elevation: 0,
      border: true,
      class: 'border-e',
    },

    VDialog: {
      rounded: 'lg',
      elevation: 0,
      maxWidth: 500,
      // Accessibility: dialogs should keep focus trapped; Vuetify does this.
      // Just ensure you provide `aria-label` / titles at usage sites.
    },

    VSnackbar: {
      rounded: 'lg',
      elevation: 0,
      location: 'top',
      timeout: 3000,
    },

    VTooltip: {
      location: 'top',
      transition: 'fade-transition',
    },

    VMenu: {
      rounded: 'lg',
      elevation: 2,
      transition: 'scale-transition',
    },

    VTabs: {
      color: 'primary',
      density: 'comfortable',
      // `hideSlider` exists, but using sliderColor is usually enough.
      // Keep slider visible for affordance.
      sliderColor: 'primary',
    },
    VTab: {
      ripple: true,
    },

    VProgressCircular: {
      color: 'primary',
      width: 3,
    },
    VProgressLinear: {
      color: 'primary',
      height: 4,
      rounded: true,
    },

    VDivider: {
      thickness: 1,
      opacity: 0.5,
    },

    VBadge: {
      color: 'error',
      dot: false,
      inline: false,
    },

    VAvatar: {
      rounded: 'circle',
      size: 'default',
    },

    VIcon: {
      size: 'default',
    },

    VSwitch: {
      color: 'primary',
      hideDetails: 'auto',
      inset: false,
    },
    VCheckbox: {
      color: 'primary',
      hideDetails: 'auto',
    },
    VRadio: {
      color: 'primary',
      hideDetails: 'auto',
    },

    VSlider: {
      color: 'primary',
      thumbLabel: false,
      hideDetails: 'auto',
    },

    VFileInput: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary',
      hideDetails: 'auto',
      rounded: 'lg',
    },

    VExpansionPanel: {
      elevation: 0,
      rounded: 'lg',
    },
    VExpansionPanels: {
      variant: 'default',
    },

    VAlert: {
      variant: 'flat',
      border: 'start',
      rounded: 'lg',
      elevation: 0,
      // `borderColor` is not consistently supported across versions; set `color` per alert usage.
    },

    VBanner: {
      elevation: 0,
      rounded: 'lg',
      border: true,
    },

    VBottomSheet: {
      rounded: 't-lg',
      elevation: 8,
    },

    VStepper: {
      elevation: 0,
      flat: true,
      rounded: 'lg',
    },

    VTimeline: {
      density: 'comfortable',
      side: 'end',
    },

    VToolbar: {
      flat: true,
      elevation: 0,
      density: 'comfortable',
    },
  },

  // Global density is valid in Vuetify 3.
  // Keep it here; it plays nicely with your component defaults.
  // (If you want per-user preference, wire it to a store and recreate Vuetify once.)
  defaultProps: {
    // Vuetify 3 supports default props via `defaults` already.
    // Leave this empty unless you have very specific global props.
  },

  // Icons: keep aliases. If you use SVG sets, define `sets` here too.
  icons: {
    defaultSet: 'mdi',
    aliases: {
      add: 'mdi-plus',
      edit: 'mdi-pencil',
      delete: 'mdi-delete',
      save: 'mdi-content-save',
      cancel: 'mdi-close',
      search: 'mdi-magnify',
      filter: 'mdi-filter',
      sort: 'mdi-sort',
      menu: 'mdi-menu',
      close: 'mdi-close',
      check: 'mdi-check',
      error: 'mdi-alert-circle',
      warning: 'mdi-alert',
      info: 'mdi-information',
      success: 'mdi-check-circle',
    },
  },
});
