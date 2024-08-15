describe('Dropfile Component', () => {
  it('should handle file upload via drag and drop', () => {
    // Visit the page containing the Dropfile component
    cy.visit('/'); // Update with the correct path if needed

    // Create a mock file to upload
    const fileName = 'mock-video.mp4';
    const fileType = 'video/mp4';
    const fileContent = 'mock content';

    cy.fixture(fileName).then((fileContent) => {
      const file = new File([fileContent], fileName, { type: fileType });

      // Simulate dragging and dropping the file
      cy.get('label')
        .trigger('dragover')
        .trigger('drop', {
          dataTransfer: { files: [file] },
        });

      // Verify the event was emitted and the file is displayed
      cy.contains(fileName).should('exist');
    });
  });

  it('should handle file upload via file input', () => {
    // Visit the page containing the Dropfile component
    cy.visit('/'); // Update with the correct path if needed

    // Create a mock file to upload
    const fileName = 'mock-video.mp4';
    const fileType = 'video/mp4';
    const fileContent = 'mock content';

    cy.fixture(fileName).then((fileContent) => {
      const file = new File([fileContent], fileName, { type: fileType });

      // Simulate file selection via the file input
      cy.get('input[type="file"]').attachFile(file);

      // Verify the event was emitted and the file is displayed
      cy.contains(fileName).should('exist');
    });
  });
});
