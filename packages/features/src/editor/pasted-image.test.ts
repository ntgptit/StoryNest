import { describe, expect, it } from "vitest";
import { pastedImage } from "./model/pasted-image.ts";

function paste(files: File[], text = "") {
  return {
    clipboardData: {
      files: files as unknown as FileList,
      getData: (type: string) => (type === "text/plain" ? text : ""),
    } as unknown as DataTransfer,
  };
}

describe("pastedImage", () => {
  const png = new File(["x"], "shot.png", { type: "image/png" });

  it("takes the picture of a screenshot or a copied image", () => {
    expect(pastedImage(paste([png]))).toBe(png);
    expect(pastedImage(paste([new File(["x"], "a.txt", { type: "text/plain" }), png]))).toBe(png);
  });

  it("leaves text pastes (even with a rendered image attached) and plain files to the editor", () => {
    expect(pastedImage(paste([png], "Chapter one"))).toBeUndefined();
    expect(pastedImage(paste([]))).toBeUndefined();
    expect(pastedImage(paste([new File(["x"], "a.pdf", { type: "application/pdf" })]))).toBeUndefined();
    expect(pastedImage({ clipboardData: null })).toBeUndefined();
  });
});
