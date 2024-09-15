import { VideoFormat } from '@/enum/video-format';
import { AudioFormat } from '@/enum/audio-format';
import { ImageFormat } from '@/enum/image-format';

export const VIDEO_CONVERSION_FORMATS = [
  VideoFormat.MP4,
  VideoFormat.WEBM,
  VideoFormat.FLV,
  VideoFormat.AVI,
  VideoFormat.MOV,
  VideoFormat.WMV,
  VideoFormat.GP3,
  VideoFormat.MKV,
  VideoFormat.M4V,
  VideoFormat.MPG,
  VideoFormat.MPEG,
  VideoFormat.VOB,
  VideoFormat.TS,
  VideoFormat.ASF,
  VideoFormat.F4V,
  VideoFormat.H264,
  VideoFormat.HEVC,
  VideoFormat.M2TS,
  VideoFormat.M2V,
  VideoFormat.MTS,
  VideoFormat.OGV,
  VideoFormat.RM,
  VideoFormat.SWF,
];

export const AUDIO_CONVERSION_FORMATS = [
  AudioFormat.MP3,
  AudioFormat.WAV,
  AudioFormat.OGG,
  AudioFormat.M4A,
  AudioFormat.FLAC,
  AudioFormat.WMA,
  AudioFormat.AAC,
  AudioFormat.AMR,
  AudioFormat.AIFF,
  AudioFormat.AU,
  AudioFormat.MKA,
  AudioFormat.AC3,
  AudioFormat.APE,
  AudioFormat.MPC,
  AudioFormat.OPUS,
];

export const IMAGE_CONVERSION_FORMATS = [
  ImageFormat.JPG,
  ImageFormat.PNG,
  ImageFormat.BMP,
  ImageFormat.GIF,
  ImageFormat.TIFF,
  ImageFormat.WEBP,
  ImageFormat.ICO,
  ImageFormat.JPEG,
];
