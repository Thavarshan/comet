/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './ui/css/index.css';

import { messages } from './locales/messages';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import { createPinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import { createApp } from 'vue';
import App from './ui/app.vue';
import { Locale } from '@/enum/locale';

const pinia = createPinia();
const i18n = createI18n({
  legacy: false,
  locale: Locale.EN,
  messages,
});
const app = createApp(App);

pinia.use(piniaPluginPersistedstate);
app.use(pinia);
app.use(i18n);

app.mount('#app');
