# Release Notes

## [Unreleased](https://github.com/stellar-comet/comet/compare/v2.0.4...HEAD)

## [v2.0.4](https://github.com/stellar-comet/comet/compare/v1.0.0...v2.0.4) - 2024-09-14

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

**Full Changelog**: https://github.com/stellar-comet/comet/compare/v1.0.0...v2.0.4

## [v1.0.0](https://github.com/stellar-comet/comet/compare/v0.0.3...v1.0.0) - 2024-09-02

Initial stable release.

## [v0.0.3](https://github.com/stellar-comet/comet/compare/v0.0.2...v0.0.3) - 2024-08-24

### Added

- Realtime conversion progress and UI updates ([#13](https://github.com/stellar-comet/comet/issues/13))
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

## [v0.0.2](https://github.com/stellar-comet/comet/compare/v0.0.1...v0.0.2) - 2024-08-22

### Added

- Overhauled UI and icons
- Update media content

### Fixed

- Published distributables are corrupt ([#5](https://github.com/stellar-comet/comet/issues/5))
- Unknown system error -88 ([#1](https://github.com/stellar-comet/comet/issues/1))

## [v0.0.1](https://github.com/stellar-comet/comet/compare/v0.0.0...v0.0.1) - 2024-08-17

Initial alpha release for public testing and feedback.
