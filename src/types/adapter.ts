export interface Adapter {
  /**
   * Converts the file at the given path to the specified output format.
   */
  convert(
    id: string,
    filePath: string,
    outputFormat: string,
    saveDirectory: string,
    event: Electron.IpcMainInvokeEvent,
  ): Promise<string>;

  /**
   * Cancels the FFmpeg conversion process with the given ID.
   */
  cancel(id: string): boolean;
}
