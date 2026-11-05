"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageError, checkImageFile } from "./image-prepare.ts";

/** A picked picture waiting in the crop editor: the file, an object URL to show it and its decoded size. */
export interface CropSource {
  file: File;
  url: string;
  width: number;
  height: number;
}

/**
 * Size of the picture as the upload renderer will see it: same decoder (createImageBitmap, which applies the EXIF
 * orientation like <img>), so the crop rectangle picked on screen is in the renderer's pixels.
 */
async function measureImage(file: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  try {
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

/**
 * The step between picking a file and uploading it (ImageCropDialog). `open(file)` checks type and size first (the
 * same checks as prepareImage, so a wrong file is refused without a dialog), decodes the size and then shows the
 * editor; `close()` hides it. The object URL is revoked when the editor closes, another file is picked or the
 * component unmounts. A file that cannot be decoded is reported as `unreadable`.
 */
export function useCropSource() {
  const [source, setSource] = useState<CropSource | null>(null);
  const [error, setError] = useState<ImageError | null>(null);
  /** Bumped by every open/close and on unmount, so a slow decode of an older pick is dropped. */
  const attempt = useRef(0);

  useEffect(() => {
    if (source === null) return;
    const { url } = source;
    return () => URL.revokeObjectURL(url);
  }, [source]);

  useEffect(
    () => () => {
      attempt.current += 1;
    },
    [],
  );

  const open = useCallback((file: File) => {
    const ticket = ++attempt.current;
    setError(null);
    setSource(null);
    const problem = checkImageFile(file);
    if (problem !== null) {
      setError(new ImageError(problem));
      return;
    }
    measureImage(file).then(
      ({ width, height }) => {
        if (ticket !== attempt.current) return;
        if (width === 0 || height === 0) {
          setError(new ImageError("unreadable"));
          return;
        }
        setSource({ file, url: URL.createObjectURL(file), width, height });
      },
      () => {
        if (ticket === attempt.current) setError(new ImageError("unreadable"));
      },
    );
  }, []);

  const close = useCallback(() => {
    attempt.current += 1;
    setSource(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { source, error, open, close, clearError };
}
