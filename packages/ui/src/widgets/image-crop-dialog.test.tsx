import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ImageCropDialog, type ImageCropLabels } from "./image-crop-dialog.tsx";

afterEach(cleanup);

const labels: ImageCropLabels = {
  title: "Adjust",
  description: "Drag and zoom",
  frame: "Picture position",
  zoom: "Zoom",
  confirm: "Use photo",
  cancel: "Cancel",
};

function setup(props: Partial<Parameters<typeof ImageCropDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ImageCropDialog
      imageUrl="blob:picture"
      imageWidth={1200}
      imageHeight={600}
      aspect={1}
      shape="round"
      labels={labels}
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );
  const frame = screen.getByRole("application", { name: labels.frame });
  const confirm = () => fireEvent.click(screen.getByRole("button", { name: labels.confirm }));
  return { onConfirm, onCancel, frame, confirm };
}

/** Gives the frame a 300 x 300 box on screen (jsdom lays nothing out). */
function layOut(frame: HTMLElement, width = 300, height = 300) {
  frame.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width, height, right: width, bottom: height, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
}

describe("ImageCropDialog", () => {
  it("shows the picture in a labelled dialog and confirms the centred crop when nothing was changed", () => {
    const { onConfirm, confirm } = setup();
    expect(screen.getByRole("dialog", { name: labels.title })).toBeTruthy();
    expect(document.querySelector("img")?.getAttribute("src")).toBe("blob:picture");
    confirm();
    expect(onConfirm).toHaveBeenCalledWith({ x: 300, y: 0, width: 600, height: 600 });
  });

  it("cancels with the button and with Escape, without confirming", () => {
    const { onConfirm, onCancel } = setup();
    fireEvent.click(screen.getByRole("button", { name: labels.cancel }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("moves with the arrow keys (← shows more of the left) and zooms with + and −", () => {
    const { onConfirm, frame, confirm } = setup();
    fireEvent.keyDown(frame, { key: "ArrowLeft" }); // 2 % of the 600 px crop
    confirm();
    expect(onConfirm).toHaveBeenLastCalledWith({ x: 288, y: 0, width: 600, height: 600 });

    fireEvent.keyDown(frame, { key: "+" });
    fireEvent.keyDown(frame, { key: "+" });
    confirm();
    const zoomed = onConfirm.mock.lastCall?.[0];
    expect(zoomed.width).toBeCloseTo(600 / 1.2, 6);
    expect((screen.getByRole("slider", { name: labels.zoom }) as HTMLInputElement).value).toBe("120");

    fireEvent.keyDown(frame, { key: "-" });
    fireEvent.keyDown(frame, { key: "-" });
    fireEvent.keyDown(frame, { key: "-" }); // below 1: clamped
    confirm();
    expect(onConfirm.mock.lastCall?.[0].width).toBe(600);
  });

  it("never shows an empty area: arrows stop at the edge", () => {
    const { onConfirm, frame, confirm } = setup();
    for (let i = 0; i < 100; i++) fireEvent.keyDown(frame, { key: "ArrowRight", shiftKey: true });
    for (let i = 0; i < 100; i++) fireEvent.keyDown(frame, { key: "ArrowDown", shiftKey: true });
    confirm();
    expect(onConfirm).toHaveBeenLastCalledWith({ x: 600, y: 0, width: 600, height: 600 });
  });

  it("zooms with the slider", () => {
    const { onConfirm, confirm } = setup({ imageWidth: 600, imageHeight: 1200 });
    fireEvent.change(screen.getByRole("slider", { name: labels.zoom }), { target: { value: "200" } });
    confirm();
    expect(onConfirm).toHaveBeenLastCalledWith({ x: 150, y: 450, width: 300, height: 300 });
  });

  it("pans by dragging and zooms with the wheel around the pointer", () => {
    const { onConfirm, frame, confirm } = setup();
    layOut(frame);
    fireEvent.pointerDown(frame, { pointerId: 1, clientX: 150, clientY: 150, button: 0, pointerType: "mouse" });
    expect(frame.dataset.dragging).toBe("true");
    fireEvent.pointerMove(frame, { pointerId: 1, clientX: 225, clientY: 150, pointerType: "mouse" }); // ¼ frame right
    fireEvent.pointerUp(frame, { pointerId: 1, pointerType: "mouse" });
    expect(frame.dataset.dragging).toBeUndefined();
    confirm();
    expect(onConfirm).toHaveBeenLastCalledWith({ x: 150, y: 0, width: 600, height: 600 });

    fireEvent.wheel(frame, { deltaY: -100, clientX: 0, clientY: 0 }); // zoom in at the top-left corner
    confirm();
    const area = onConfirm.mock.lastCall?.[0];
    expect(area.width).toBeCloseTo(600 / 1.06, 6);
    expect(area.x).toBeCloseTo(150, 6); // the corner under the pointer stays put
    expect(area.y).toBeCloseTo(0, 6);
  });

  it("zooms with a two-finger pinch", () => {
    const { onConfirm, frame, confirm } = setup({ imageWidth: 600, imageHeight: 600 });
    layOut(frame);
    fireEvent.pointerDown(frame, { pointerId: 1, clientX: 100, clientY: 150, pointerType: "touch" });
    fireEvent.pointerDown(frame, { pointerId: 2, clientX: 200, clientY: 150, pointerType: "touch" });
    fireEvent.pointerMove(frame, { pointerId: 2, clientX: 300, clientY: 150, pointerType: "touch" }); // distance ×2
    confirm();
    expect(onConfirm.mock.lastCall?.[0].width).toBeCloseTo(300, 6);
  });

  it("dims outside a round mask only for the round shape", () => {
    setup();
    expect(document.querySelector(".rounded-full.shadow-\\[0_0_0_100vmax_var\\(--color-scrim\\)\\]")).not.toBeNull();
    cleanup();
    setup({ shape: "rect", aspect: 2 / 3 });
    expect(document.querySelector(".shadow-\\[0_0_0_100vmax_var\\(--color-scrim\\)\\]")).toBeNull();
  });
});
