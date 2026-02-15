import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { ar } from 'vuetify/locale';
import { codelBlueprint, fluentBlueprint } from './blueprints';
import '@mdi/font/css/materialdesignicons.css';
import 'vuetify/styles';

export default createVuetify({
  components,
  directives,
  blueprint: codelBlueprint,

  locale: {
    locale: 'ar',
    fallback: 'ar',
    messages: { ar },
    rtl: { ar: true },
  },
});
