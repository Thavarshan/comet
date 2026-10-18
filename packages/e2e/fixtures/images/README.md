# Deterministic image fixtures

`rgb.png` and `rgb.jpg` are generated 8 × 6 solid-color images, not user media.
They contain no personal information or external artwork. Generate using the
repository's pinned FFmpeg tool:

```sh
ffmpeg -f lavfi -i color=c=0x39a9aa:s=8x6:d=0.1 -frames:v 1 -update 1 rgb.png
ffmpeg -f lavfi -i color=c=red:s=8x6:d=0.1 -frames:v 1 -update 1 rgb.jpg
```

Browser tests select these files locally. Network guards reject non-static
requests and external origins; fixtures are never sent to a conversion server.
