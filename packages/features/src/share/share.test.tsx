import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { ToastProvider } from "../_shared/toast.tsx";
import { ShareButton, shareNatively, shareText, shareUrl } from "./index.ts";

const toasts = { show: vi.fn() };

const adapter = (extra: Partial<PlatformAdapter> = {}): PlatformAdapter => ({
  platform: "web",
  isNative: false,
  Link: ({ href, replace: _r, children, ...rest }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useNavigation: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/" }),
  appOrigin: () => "https://preview.app.test",
  openExternal: vi.fn(),
  ...extra,
});

function renderButton(platform: PlatformAdapter) {
  render(
    <PlatformProvider adapter={platform}>
      <ToastProvider port={toasts}>
        <ShareButton path="/story/1/rung" name="Rừng" description={shareText.story.description} />
      </ToastProvider>
    </PlatformProvider>,
  );
}

async function openDialog() {
  fireEvent.click(screen.getByRole("button", { name: shareText.open }));
  return screen.findByRole("dialog", { name: shareText.title("Rừng") });
}

const linkOf = (dialog: HTMLElement) =>
  (within(dialog).getByRole("textbox", { name: shareText.linkLabel }) as HTMLInputElement).value;

beforeEach(() => toasts.show.mockClear());
afterEach(() => {
  cleanup();
  Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
});

describe("shareUrl", () => {
  it("puts an app path on the origin, ignoring anything after the origin", () => {
    expect(shareUrl("https://site.test", "/lists/1")).toBe("https://site.test/lists/1");
    expect(shareUrl("https://site.test/some/page?x=1", "/author/a%20b")).toBe("https://site.test/author/a%20b");
  });
});

describe("shareNatively", () => {
  it("treats closing the share sheet as fine, and any other failure as a failure", async () => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: vi.fn(() => Promise.reject(Object.assign(new Error("closed"), { name: "AbortError" }))),
    });
    expect(await shareNatively({ title: "a", url: "https://site.test" })).toBe(true);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: vi.fn(() => Promise.reject(new Error("not allowed"))),
    });
    expect(await shareNatively({ title: "a", url: "https://site.test" })).toBe(false);
  });
});

describe("ShareButton", () => {
  it("builds the link on the share origin (the canonical site), not on the page's own origin", async () => {
    renderButton(adapter({ shareOrigin: () => "https://storynest.test" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    const dialog = await openDialog();
    expect(linkOf(dialog)).toBe("https://storynest.test/story/1/rung");
    expect(within(dialog).getByText(shareText.story.description)).toBeTruthy();
  });

  it("falls back to the app origin where the platform names no share origin", async () => {
    renderButton(adapter());
    expect(linkOf(await openDialog())).toBe("https://preview.app.test/story/1/rung");
  });

  it("copies the link, and says how to copy it by hand when the clipboard is blocked", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    renderButton(adapter({ shareOrigin: () => "https://storynest.test" }));
    const dialog = await openDialog();
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: shareText.copy }));
    });
    expect(writeText).toHaveBeenCalledWith("https://storynest.test/story/1/rung");
    expect(within(dialog).getByRole("status").textContent).toBe(shareText.copied);

    writeText.mockImplementation(() => Promise.reject(new Error("denied")));
    Object.defineProperty(document, "execCommand", { configurable: true, value: vi.fn(() => false) });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: shareText.copied }));
    });
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("error", shareText.copyFailed));
  });

  it("offers the system share sheet only where there is one", async () => {
    renderButton(adapter());
    expect(within(await openDialog()).queryByRole("button", { name: shareText.native })).toBeNull();
    cleanup();

    const share = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    renderButton(adapter({ shareOrigin: () => "https://storynest.test" }));
    fireEvent.click(within(await openDialog()).getByRole("button", { name: shareText.native }));
    expect(share).toHaveBeenCalledWith({ title: "Rừng", url: "https://storynest.test/story/1/rung" });
    await Promise.resolve();
    expect(toasts.show).not.toHaveBeenCalled();
  });
});
