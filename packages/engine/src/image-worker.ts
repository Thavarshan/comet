import { parentPort, workerData } from 'node:worker_threads';
import { writeFile } from 'node:fs/promises';
import { Jimp } from 'jimp';
import { conversionSchema } from '@honeymelon/contracts';

const {
  inputPath,
  outputPath,
  spec: inputSpec,
  targetFormat,
} = workerData as {
  inputPath: string;
  outputPath: string;
  spec: unknown;
  targetFormat: string;
};

async function main(): Promise<void> {
  try {
    const spec = conversionSchema.parse(inputSpec ?? { kind: 'image' });
    if (spec.kind !== 'image') {
      throw new Error('Image settings required');
    }

    const image = await Jimp.read(inputPath);
    const ratio = Math.min(
      1,
      (spec.width ?? image.bitmap.width) / image.bitmap.width,
      (spec.height ?? image.bitmap.height) / image.bitmap.height,
    );
    if (ratio < 1) {
      image.resize({
        w: Math.max(1, Math.round(image.bitmap.width * ratio)),
        h: Math.max(1, Math.round(image.bitmap.height * ratio)),
      });
    }

    if (['jpg', 'jpeg', 'avif'].includes(targetFormat)) {
      const transparent = image.bitmap.data.some(
        (value, index) => index % 4 === 3 && value < 255,
      );
      if (transparent && !spec.allowFlatten) {
        throw new Error('Confirm transparency flattening before converting');
      }

      const flattened = new Jimp({
        width: image.bitmap.width,
        height: image.bitmap.height,
        color: Number.parseInt(spec.background.slice(1) + 'ff', 16),
      });
      flattened.composite(image, 0, 0);
      image.bitmap = flattened.bitmap;
    }

    if (/\.jpe?g$/i.test(outputPath)) {
      await writeFile(
        outputPath,
        await image.getBuffer('image/jpeg', { quality: spec.quality }),
      );
    } else {
      await image.write(outputPath as `${string}.${string}`);
    }

    parentPort?.postMessage({ ok: true });
  } catch (error) {
    parentPort?.postMessage({
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

void main();
