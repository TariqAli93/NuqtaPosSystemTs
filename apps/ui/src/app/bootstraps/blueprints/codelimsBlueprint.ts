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
          background: '#F4F6F8',
          surface: '#FFFFFF',
          'surface-variant': '#E9EEF3',
          primary: '#0052CC',
          secondary: '#4B5563',
          accent: '#FF6B00',
          info: '#0077B6',
          success: '#0F9D58',
          warning: '#F4A100',
          error: '#D93025',
          'on-background': '#111827',
          'on-surface': '#111827',
        },
      },
      dark: {
        dark: true,
        colors: {
          background: '#0F172A',
          surface: '#1E293B',
          'surface-variant': '#334155',
          primary: '#3B82F6',
          secondary: '#94A3B8',
          accent: '#A78BFA',
          info: '#38BDF8',
          success: '#22C55E',
          warning: '#F59E0B',
          error: '#EF4444',
          'on-background': '#E2E8F0',
          'on-surface': '#F1F5F9',
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
