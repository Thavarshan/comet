# Release Notes

## [Unreleased](https://github.com/Thavarshan/comet/compare/v2.2.1...HEAD)

## [v2.2.1](https://github.com/Thavarshan/comet/compare/v2.1.2...v2.2.1) - 2024-09-27

### Changed

- Update media assets

### Fixed

- Save directory path in Windows is not formatted properly

**Full Changelog**: https://github.com/Thavarshan/comet/compare/v2.1.2...v2.2.1

## [v2.1.2](https://github.com/Thavarshan/comet/compare/v2.0.4...v2.1.2) - 2024-09-21

### Added

- Image conversion support using Jimp, enabling conversion of image formats such as PNG, JPEG, and BMP.

### Changed

- Improved UI design with a cleaner layout and enhanced user experience.
- Enhanced conversion performance with optimized resource usage, making conversions faster and more efficient.
- Upgraded conversion quality, particularly improving audio output and overall media fidelity.

### Fixed

- Fixed a non-persistent state issue where some settings (e.g., `convertTo` format) were not saved correctly between tab switches.
- Resolved conversion issues with certain video files that failed to process on specific platforms and architectures.
- Addressed conversion quality problems affecting the output of certain video files.
- Solved high resource usage during conversions, reducing CPU and memory consumption.
- Fixed a bug where removed files were still being processed in the conversion queue.

**Full Changelog**: https://github.com/Thavarshan/comet/compare/v2.0.4...v2.1.2

## [v2.0.4](https://github.com/Thavarshan/comet/compare/v1.0.0...v2.0.4) - 2024-09-14

### Added

- Dark mode
- Multi-language support
- Audio conversion support

### Changed

- Improved UI design with better user experience
- Improved conversion performance withy less resource usage
- Improved conversion quality with better audio quality

### Fixed

- Non-persistent state issue
- Conversion issue with some video files on some platforms and architectures
- Conversion quality issue with some video files
- High resource usage issue
- Removed files would still be included in conversion queue

**Full Changelog**: https://github.com/Thavarshan/comet/compare/v1.0.0...v2.0.4

## [v1.0.0](https://github.com/Thavarshan/comet/compare/v0.0.3...v1.0.0) - 2024-09-02

Initial stable release.

## [v0.0.3](https://github.com/Thavarshan/comet/compare/v0.0.2...v0.0.3) - 2024-08-24

### Added

- Realtime conversion progress and UI updates ([#13](https://github.com/Thavarshan/comet/issues/13))
- Cancel conversion featrue
- Already converted indication on UI
- Tooltips to cancel and remove buttons

### Changed

- Use `lucide-vue-next` icons instead of `@heroicons/vue`
- Window dimensions
- Use of `ffprobe` for video conversion progress tracking
- Title bar content

### Fixed

- Invalid executable name on `MacOS`

## [v0.0.2](https://github.com/Thavarshan/comet/compare/v0.0.1...v0.0.2) - 2024-08-22

### Added

- Overhauled UI and icons
- Update media content

### Fixed

- Published distributables are corrupt ([#5](https://github.com/Thavarshan/comet/issues/5))
- Unknown system error -88 ([#1](https://github.com/Thavarshan/comet/issues/1))

## [v0.0.1](https://github.com/Thavarshan/comet/compare/v0.0.0...v0.0.1) - 2024-08-17

Initial alpha release for public testing and feedback.
