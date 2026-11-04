"use client";

import { useMutation } from "@tanstack/react-query";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError } from "../../_shared/errors.ts";
import { createBrowserRenderer, prepareImage, type ImageRenderer } from "../../_shared/image-prepare.ts";
import { uploadChapterImage } from "../api/images.api.ts";

/** A picture inside a chapter keeps its own shape; it is only shrunk so a phone is not sent a 12 MB photo. */
export const CHAPTER_IMAGE_MAX_WIDTH = 1600;
const renderChapterImage: ImageRenderer = createBrowserRenderer({ aspect: null, maxWidth: CHAPTER_IMAGE_MAX_WIDTH });

/** Prepares and uploads a picked picture; resolves to its storage key. ImageError passes through for the screen. */
export function useUploadChapterImage(storyId: string, render: ImageRenderer = renderChapterImage) {
  const getClient = useDataClientGetter();
  return useMutation<string, Error, File>({
    mutationFn: async (file) => {
      const image = await prepareImage(file, render);
      try {
        return await uploadChapterImage(getClient(), storyId, image);
      } catch (error) {
        throw toAppError(error);
      }
    },
  });
}
