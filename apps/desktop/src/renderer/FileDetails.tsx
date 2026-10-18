import { useEffect, useState, type ReactElement } from 'react';
import { unwrap, type MediaMetadata, type SourceFile } from '@comet/contracts';

/**
 * Inspect a draft through the engine's bounded native scheduler.
 * Removing a row cancels inspection and ignores any response already in flight.
 */
export function FileDetails({
  file,
  metadata,
  locale,
}: {
  file: SourceFile;
  metadata?: MediaMetadata | undefined;
  locale: string;
}): ReactElement {
  const [source, setSource] = useState(metadata);
  useEffect(() => {
    if (metadata) {
      return;
    }

    let disposed = false;
    void window.comet
      .inspectFile(file)
      .then(unwrap)
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
      void window.comet.cancelInspection(file.itemId).catch(() => {});
    };
  }, [file, metadata]);
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
