<p align="center"><a href="https://comet.thavarshan.com" target="_blank"><img src="https://github.com/Thavarshan/comet/blob/main/assets/logo.svg" width="400" height="400" alt="Comet"></a></p>

<p align="center">
<a href="https://github.com/Thavarshan/comet/actions"><img src="https://github.com/Thavarshan/comet/actions/workflows/test.yml/badge.svg" alt="Test Status"></a>
<a href="https://github.com/Thavarshan/comet/actions"><img src="https://github.com/Thavarshan/comet/actions/workflows/build.yml/badge.svg" alt="Build Status"></a>
<a href="https://github.com/Thavarshan/comet/actions"><img src="https://github.com/Thavarshan/comet/actions/workflows/release.yml/badge.svg?branch=release" alt="Release Status"></a>
<a href="https://packagist.org/packages/jerome/filterable"><img src="https://img.shields.io/packagist/l/jerome/filterable" alt="License"></a>
</p>

> [!WARNING]
> **We don't have an Apple Developer account yet, and the application is not code-signed for both Mac and Windows. Therefore, the applications will show a warning popup on the first start.**
> On **Mac**, click **Okay**, then go to **Settings / Privacy & Security** and scroll down until you see a button **Open anyway**.
> On **Windows**, you may see a warning message indicating that the app is from an unknown publisher. Click **More info** and then **Run anyway** to proceed.

---

## About Comet

**Comet** is a cross-platform media converter application designed to make the conversion of video, audio, and image files as easy and accessible as possible. Built on top of [FFmpeg](https://ffmpeg.org/), **Jimp**, and **Electron**, Comet offers a seamless and efficient user experience for media conversions, all within a simple, intuitive interface.

![Comet UI 1](./assets/screenshot_1.png)
![Comet UI 2](./assets/screenshot_2.png)
![Comet UI 3](./assets/screenshot_3.png)
![Comet UI 4](./assets/screenshot_4.png)

---

## Project Overview

Comet's goal is to provide a **free, user-friendly, and visually appealing** application for converting media files. Whether you need to convert a single file or multiple files at once, Comet is designed to make the process straightforward.

### Key Features

- **Cross-Platform Compatibility:** Works seamlessly on macOS, Windows, and Linux.
- **Video, Audio, and Image Conversion:**
  - Video formats: MP4, MKV, AVI, MOV, etc.
  - Audio formats: MP3, WAV, AAC, FLAC, etc.
  - Image formats: JPEG, PNG, BMP, ICO, ICNS, etc.
- **Bulk File Conversion:** Easily upload and convert multiple files in one go.
- **Real-Time Progress Tracking:** Track the progress of each conversion with real-time feedback.
- **Dark Mode:** A sleek dark theme for more comfortable use.
- **Multi-Language Support:** Available in multiple languages for a global audience.
- **Cancel/Resume Conversions:** Cancel ongoing conversions, with options to manage individual items in the queue.
- **Jimp and FFmpeg Integration:** Use Jimp for images and FFmpeg for audio/video conversion.

---

## Recent Updates

- **Unified Conversion Handler:** We’ve refactored the media conversion process to use an **Adapter Pattern**, allowing for a unified conversion handler for video, audio, and image files using either **FFmpeg** or **Jimp** depending on the file type.
- **Advanced Testing:** Expanded unit tests using **Jest** to cover media conversion handlers and IPC processes.
- **Improved Performance:** Faster conversions through optimizations to how we handle bulk file uploads and media processing queues.
- **Enhanced UI and UX:** More responsive interface and clearer progress tracking for large file batches.

---

## Technologies Used

- **Electron:** For building the cross-platform desktop application.
- **Vue.js (with Composition API and TypeScript):** For the frontend UI.
- **FFmpeg & Jimp:** Core engines for media conversion (video/audio via FFmpeg, images via Jimp).
- **Node.js:** Backend services and media processing.
- **Vite:** Modern build tool for fast development.
- **Tailwind CSS:** For styling and responsive design.
- **i18n:** Internationalization for multi-language support.
- **Jest:** For unit testing.
- **GitHub Actions:** Continuous Integration/Continuous Deployment (CI/CD) and release automation.

---

## Getting Started

To get started with Comet:

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Thavarshan/comet.git
   cd comet
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Run the application in development mode:**

   ```bash
   npm run start
   ```

4. **Build the application for production:**

   ```bash
   npm run make
   ```

5. **Test your changes:**

   ```bash
   npm run test
   ```

---

## Roadmap

- **Phase 1:** Basic UI Implementation (Completed)
  - File upload functionality, file list management.

- **Phase 2:** FFmpeg & Jimp Integration (Completed)
  - Core conversion functionality for video, audio, and images.

- **Phase 3:** UI Enhancements (Completed)
  - Improved conversion progress tracking and batch conversion options.

- **Phase 4:** Cross-Platform Testing and Releases (In Progress)
  - Testing on macOS, Windows, and Linux.
  - Package the app for distribution across platforms.
  - Address macOS code-signing challenges (currently blocked by lack of Apple Developer account).

---

## Contributing

Contributions are welcome! Here’s how you can contribute:

1. **Fork the Repository:** Create a fork of this repository.
2. **Clone the Repo:** Clone the forked repository to your local machine.
3. **Create a Branch:** Create a new branch for your feature or fix.
4. **Make Your Changes:** Ensure your changes work as expected and pass tests.
5. **Submit a Pull Request:** Once done, submit a PR to the `main` branch.
6. **Star the Repo:** If you like Comet, please give it a ⭐!

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgements

- [FFmpeg](https://ffmpeg.org/) - The powerful multimedia framework that powers video/audio conversion in Comet.
- [Jimp](https://github.com/oliver-moran/jimp) - Image processing in Comet.
- [Electron](https://www.electronjs.org/) - For building cross-platform desktop apps.
- The [Vue.js](https://vuejs.org/) and [Tailwind CSS](https://tailwindcss.com/) communities for their fantastic tools and support.
