import { useEffect, useState, type ReactElement } from 'react';
import type { MediaMetadata } from '@comet/contracts';
import type { DraftFile } from './platform.js';
import { useConverter } from './state.js';

/**
 * Inspect a draft through the platform's bounded scheduler.
 * Removing a row cancels inspection and ignores any response already in flight.
 */
export function FileDetails({
  file,
  metadata,
  locale,
}: {
  file: DraftFile;
  metadata?: MediaMetadata | undefined;
  locale: string;
}): ReactElement {
  const [source, setSource] = useState(metadata);
  const { platform } = useConverter();
  useEffect(() => {
    if (metadata) {
      return;
    }

    let disposed = false;
    const controller = new AbortController();
    void platform.service
      .probe(
        { id: file.itemId, name: file.name, sizeBytes: file.sizeBytes },
        controller.signal,
      )
      .then((value) => {
        if (!disposed) {
          setSource(value);
        }
      })
      .catch(() => {
        /* Encoding reports corrupt inputs with recovery actions. */
      });

    return () => {
      disposed = true;
      controller.abort();
    };
  }, [file.itemId, file.name, file.sizeBytes, metadata, platform]);
  const size = new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: file.sizeBytes >= 1e6 ? 'megabyte' : 'kilobyte',
    maximumFractionDigits: 1,
  }).format(file.sizeBytes / (file.sizeBytes >= 1e6 ? 1e6 : 1e3));
  const details = metadata ?? source;
  const minutes = details?.duration
    ? `${Math.floor(details.duration / 60)}:${Math.floor(details.duration % 60)
        .toString()
        .padStart(2, '0')}`
    : null;

  return (
    <span className="source-details">
      {[
        size,
        details?.width && details.height
          ? `${details.width} × ${details.height}`
          : null,
        minutes,
        details?.audio[0]?.codec.toUpperCase(),
      ]
        .filter(Boolean)
        .join(' · ')}
    </span>
  );
}
