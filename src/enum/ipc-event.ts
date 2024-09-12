export enum IpcEvent {
  CANCEL_CONVERSION = 'cancel-conversion',
  CANCEL_ITEM_CONVERSION = 'cancel-item-conversion',
  CONVERT_VIDEO = 'convert-video',
  DIALOG_SELECT_DIRECTORY = 'dialog:select-directory',
  GET_DESKTOP_PATH = 'get-desktop-path',
  SHOW_WINDOW = 'show-window',
  CLICK_TITLEBAR_MAC = 'click-titlebar-mac',
  SET_NATIVE_THEME = 'set-native-theme',
  IS_DEV_MODE = 'is-dev-mode',
  OPEN_EXTERNAL_LINK = 'open-external-link',
  GET_PROJECT_NAME = 'get-project-name',
  LOAD_GIST_REQUEST = 'load-gist-request',
  LOAD_ELECTRON_EXAMPLE_REQUEST = 'load-electron-example-request',
}

export const ipcMainEvents = [
  IpcEvent.CANCEL_CONVERSION,
  IpcEvent.CANCEL_ITEM_CONVERSION,
  IpcEvent.CONVERT_VIDEO,
  IpcEvent.DIALOG_SELECT_DIRECTORY,
  IpcEvent.GET_DESKTOP_PATH,
  IpcEvent.SHOW_WINDOW,
  IpcEvent.CLICK_TITLEBAR_MAC,
  IpcEvent.SET_NATIVE_THEME,
  IpcEvent.IS_DEV_MODE,
  IpcEvent.OPEN_EXTERNAL_LINK,
  IpcEvent.GET_PROJECT_NAME,
  IpcEvent.LOAD_GIST_REQUEST,
  IpcEvent.LOAD_ELECTRON_EXAMPLE_REQUEST,
];

