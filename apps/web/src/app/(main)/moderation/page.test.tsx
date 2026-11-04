import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
vi.mock("@/lib/auth/require-user", () => ({ requireUser: (path: string) => requireUser(path) }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("./moderation-view", () => ({ ModerationView: () => null }));

import ModerationPage from "./page";

beforeEach(() => requireUser.mockReset());

describe("the moderation page", () => {
  it("asks for a signed-in user and remembers where to come back to", async () => {
    requireUser.mockResolvedValue({ id: "m1", email: undefined, isModerator: true });
    await ModerationPage();
    expect(requireUser).toHaveBeenCalledWith("/moderation");
  });

  it("does not exist for anyone who is not a moderator", async () => {
    requireUser.mockResolvedValue({ id: "u1", email: undefined, isModerator: false });
    await expect(ModerationPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders the console for a moderator", async () => {
    requireUser.mockResolvedValue({ id: "m1", email: undefined, isModerator: true });
    await expect(ModerationPage()).resolves.toBeTruthy();
  });
});
