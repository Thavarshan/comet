/* eslint-disable @typescript-eslint/no-empty-function */

import { IpcRendererEvent } from 'electron';

/* eslint-disable @typescript-eslint/no-unused-vars */
describe('SaveDirectory Component', () => {
  it('should select a directory and emit the correct event', () => {
    // Mock the electron API
    cy.window().then((win) => {
      win.electron = {
        selectDirectory: cy.stub().resolves('/selected/directory'),
        getDownloadsPath: () => '',
        convertVideo: (filePath: string, outputFormat: string, saveDirectory: string) => Promise.resolve(''),
        on: (channel: string, callback: (event: IpcRendererEvent, ...args: unknown[]) => void) => { },
        removeAllListeners: (channel: string) => { },
      };
    });

    // Visit the page containing the SaveDirectory component
    cy.visit('/'); // Update with the correct path if needed

    // Simulate clicking the "Save to" button
    cy.contains('button', 'Save to').click();

    // Verify that the selected directory is displayed
    cy.contains('/selected/directory').should('exist');

    // Verify that the correct event was emitted
    cy.window().then((win) => {
      expect(win.electron.selectDirectory).to.have.been.calledOnce;
    });
  });
});
