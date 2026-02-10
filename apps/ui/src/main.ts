import './styles/main.scss';
import { createApp } from 'vue';
import App from './App.vue';
import { pinia } from './app/pinia';
import router from './app/router';
import { vuetify } from './app/bootstraps';
import 'vue-toastification/dist/index.css';
import './styles/main.scss';
import './styles/tailwind.css';

const app = createApp(App);

document.documentElement.setAttribute('dir', 'rtl');
document.documentElement.setAttribute('lang', 'ar');

app.use(pinia);
app.use(router);
app.use(vuetify);

app.mount('#app');
