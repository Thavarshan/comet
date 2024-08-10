declare global {
    interface Window {
        electron: {
            selectDirectory: () => Promise<string | undefined>;
            getDownloadsPath: () => string;
            // Add other methods as needed
        };
    }
}

export { };
