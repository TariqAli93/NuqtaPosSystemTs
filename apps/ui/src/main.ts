import { createApp } from 'vue';
import App from './App.vue';
import { pinia } from './app/pinia';
import router from './app/router';
import { vuetify } from './app/bootstraps';
import { createToastflow } from 'vue-toastflow';
import 'vue-toastflow/dist/vue-toastflow.css';
import '@/styles/main.css';

const app = createApp(App);

document.documentElement.setAttribute('dir', 'rtl');
document.documentElement.setAttribute('lang', 'ar');

app.use(pinia);
app.use(router);
app.use(vuetify);
app.use(
  createToastflow({
    position: 'top-left',
    duration: 3000,
    closeButton: true,
    maxVisible: 3,
  })
);

app.mount('#app');
