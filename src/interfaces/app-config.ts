import { BrowserWindowConstructorOptions } from 'electron';

export interface AppConfig extends BrowserWindowConstructorOptions {
  appName: string,
  productName: string,
  title: string,
  appId: string,
  isDev: boolean,
};
