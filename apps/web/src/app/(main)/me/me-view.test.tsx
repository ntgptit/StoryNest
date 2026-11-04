// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PlatformProvider, setLanguage, type PlatformAdapter } from "@storynest/features";

import { MeView } from "./me-view";

afterEach(() => {
  cleanup();
  setLanguage("vi", { persist: false });
});

const adapter = {
  platform: "web",
  isNative: false,
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
  useNavigation: () => ({
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
    refresh: () => undefined,
    pathname: "/me",
  }),
  appOrigin: () => "https://app.test",
  openExternal: () => undefined,
} as unknown as PlatformAdapter;

const view = (profile: { displayName: string; username: string; bio: string | null } | null) => (
  <PlatformProvider adapter={adapter}>
    <MeView profile={profile} email="a@b.co" />
  </PlatformProvider>
);

describe("MeView", () => {
  it("shows the account in Vietnamese, and its labels in English once the language changes", () => {
    const { rerender } = render(view({ displayName: "An", username: "an_nguyen", bio: null }));
    expect(screen.getByText("Hồ sơ của bạn")).toBeTruthy();
    expect(screen.getByText("Chưa có giới thiệu.")).toBeTruthy();
    expect(screen.getByText("@an_nguyen")).toBeTruthy();
    expect(screen.getByText("a@b.co")).toBeTruthy();
    act(() => setLanguage("en", { persist: false }));
    rerender(view({ displayName: "An", username: "an_nguyen", bio: null }));
    expect(screen.getByText("Your profile")).toBeTruthy();
    expect(screen.getByText("No bio yet.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Edit profile" }).getAttribute("href")).toBe("/me/edit");
  });

  it("shows the bio as written and a message when there is no profile", () => {
    const { rerender } = render(view({ displayName: "An", username: "an", bio: "Viết truyện đêm." }));
    expect(screen.getByText("Viết truyện đêm.")).toBeTruthy();
    rerender(view(null));
    expect(screen.getByText("Chưa tìm thấy hồ sơ cho tài khoản này.")).toBeTruthy();
  });
});
