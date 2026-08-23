import { useEffect, useState } from "react";
import { getObjectUrl } from "../utils/fileStore";

/**
 * Geeft een bruikbare `src`/URL terug voor een bestand dat via IndexedDB
 * (fileId) of, voor nog niet-gemigreerde oude data, als inline dataURL is
 * opgeslagen. Laadt de object-URL asynchroon op zodra fileId beschikbaar is.
 */
export function useFileSrc(fileId?: string, legacyDataUrl?: string): string | undefined {
  const [src, setSrc] = useState<string | undefined>(legacyDataUrl);

  useEffect(() => {
    let cancelled = false;
    if (!fileId) {
      setSrc(legacyDataUrl);
      return;
    }
    getObjectUrl(fileId)
      .then((url) => { if (!cancelled) setSrc(url || legacyDataUrl); })
      .catch(() => { if (!cancelled) setSrc(legacyDataUrl); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId, legacyDataUrl]);

  return src;
}
