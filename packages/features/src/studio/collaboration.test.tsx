import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { AppError } from "../_shared/errors.ts";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { TEST_USER_ID, testSession, withAuth } from "../_shared/test-auth.ts";
import { ToastProvider } from "../_shared/toast.tsx";
import {
  cancelInvitation,
  inviteCollaborator,
  listCollaborators,
  listMyInvitations,
  listStoryInvitations,
  removeCollaborator,
  respondToInvitation,
} from "./api/collaboration.api.ts";
import { TeamScreen } from "./index.ts";
import { MyInvitations } from "./components/my-invitations.tsx";
import {
  invitationErrorMessage,
  inviteErrorMessage,
  toCollaborators,
  toMyInvitations,
  toStoryInvitations,
} from "./model/collaboration.ts";
import { studioText } from "./strings.ts";

afterEach(cleanup);

const t = studioText.team;
const STORY_ID = "5eed0000-0000-4000-8000-00000000e001";
const INV_ID = "1d000000-0000-4000-8000-000000000001";
const USER_B = "00000000-0000-4000-8000-0000000000bb";

const memberRow = (overrides: Record<string, unknown> = {}) => ({
  collaborator_role: "editor",
  added_at: "2026-11-04T01:00:00Z",
  user: { id: USER_B, username: "binh", display_name: "Bình" },
  ...overrides,
});
const sentRow = (overrides: Record<string, unknown> = {}) => ({
  id: INV_ID,
  invitee_username: "cuong",
  invitee_display_name: "Cường",
  collaborator_role: "co_author",
  status: "pending",
  created_at: "2026-11-04T02:00:00Z",
  ...overrides,
});
const mineRow = (overrides: Record<string, unknown> = {}) => ({
  id: INV_ID,
  story_id: STORY_ID,
  story_title: "Truyện kín",
  collaborator_role: "editor",
  inviter_username: "an",
  inviter_display_name: "An",
  created_at: "2026-11-04T02:00:00Z",
  ...overrides,
});

interface FakeOptions {
  owner?: boolean;
  members?: unknown[];
  sent?: unknown[];
  mine?: unknown[];
  rpc?: (name: string, args: Record<string, unknown>) => { data: unknown; error: unknown };
  deleteResult?: { data: unknown; error: unknown };
}

function fakeClient(options: FakeOptions = {}) {
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];
  const deletes: { eq: [string, unknown][] }[] = [];
  const members = { current: options.members ?? [] };
  const sent = { current: options.sent ?? [] };
  const mine = { current: options.mine ?? [] };
  const owner = options.owner ?? true;

  const from = vi.fn((table: string) => {
    const eqs: [string, unknown][] = [];
    let isDelete = false;
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "is", "order", "returns"]) builder[method] = () => builder;
    builder.eq = (column: string, value: unknown) => {
      eqs.push([column, value]);
      return builder;
    };
    builder.delete = () => {
      isDelete = true;
      deletes.push({ eq: eqs });
      return builder;
    };
    builder.maybeSingle = () =>
      Promise.resolve(
        table === "stories"
          ? {
              data: {
                id: STORY_ID,
                owner_id: owner ? TEST_USER_ID : "someone",
                slug: "s",
                title: "Truyện kín",
                synopsis: "",
                category_id: null,
                language_code: "vi",
                status: "draft",
                visibility: "private",
                is_mature: false,
                deleted_at: null,
              },
              error: null,
            }
          : { data: owner ? null : { collaborator_role: "editor" }, error: null },
      );
    builder.then = (resolve: (value: unknown) => unknown) =>
      resolve(
        isDelete
          ? (options.deleteResult ?? { data: [{ user_id: USER_B }], error: null })
          : { data: members.current, error: null },
      );
    return builder;
  });
  const rpc = vi.fn(async (name: string, args: Record<string, unknown> = {}) => {
    rpcCalls.push({ name, args });
    const custom = options.rpc?.(name, args);
    if (custom) return custom;
    if (name === "list_my_invitations") return { data: mine.current, error: null };
    if (name === "list_story_invitations") return { data: sent.current, error: null };
    return { data: name === "invite_collaborator" ? INV_ID : null, error: null };
  });
  return { from, rpc, rpcCalls, deletes, members, sent, mine };
}

describe("collaboration model", () => {
  it("maps rows, falls back to the username for a blank name, and drops rows with unknown values", () => {
    expect(
      toMyInvitations([
        mineRow(),
        mineRow({ collaborator_role: "owner" }),
        mineRow({ inviter_display_name: " " }),
      ] as never),
    ).toMatchObject([{ storyTitle: "Truyện kín", role: "editor", inviterName: "An" }, { inviterName: "an" }]);
    expect(
      toStoryInvitations([sentRow(), sentRow({ status: "weird" }), sentRow({ collaborator_role: "x" })] as never),
    ).toHaveLength(1);
    expect(toStoryInvitations([sentRow()] as never)[0]).toMatchObject({
      inviteeName: "Cường",
      status: "pending",
      role: "co_author",
    });
  });

  it("accepts the embedded user as object or one-element array, ignores a missing one, and orders by join time", () => {
    const later = memberRow({
      added_at: "2026-11-04T05:00:00Z",
      user: [{ id: "u2", username: "dung", display_name: "" }],
    });
    const list = toCollaborators([
      later,
      memberRow(),
      memberRow({ user: null }),
      memberRow({ collaborator_role: "owner" }),
    ] as never);
    expect(list.map((m) => [m.username, m.name])).toEqual([
      ["binh", "Bình"],
      ["dung", "dung"],
    ]);
  });

  it("explains an invite failure by kind and an answer failure by kind", () => {
    expect(inviteErrorMessage(new AppError("notFound", "x"))).toBe(t.errors.inviteNotFound);
    expect(inviteErrorMessage(new AppError("invalid", "x"))).toBe(t.errors.inviteInvalid);
    expect(inviteErrorMessage(new AppError("conflict", "x"))).toBe(t.errors.inviteConflict);
    expect(inviteErrorMessage(new AppError("network", "x"))).toBe(studioText.errors.network);
    expect(invitationErrorMessage(new AppError("notFound", "x"))).toBe(t.errors.gone);
    expect(invitationErrorMessage(new AppError("conflict", "x"))).toBe(t.errors.settled);
    expect(invitationErrorMessage(new AppError("unknown", "x"))).toBe(studioText.errors.generic);
  });
});

describe("collaboration api", () => {
  it("sends the RPCs with the arguments the database expects (username trimmed)", async () => {
    const c = fakeClient({ sent: [sentRow()], mine: [mineRow()], members: [memberRow()] });
    const client = c as unknown as DataClient;
    expect(await inviteCollaborator(client, STORY_ID, "  cuong ", "co_author")).toBe(INV_ID);
    await respondToInvitation(client, INV_ID, true);
    await respondToInvitation(client, INV_ID, false);
    await cancelInvitation(client, INV_ID);
    expect(await listMyInvitations(client)).toHaveLength(1);
    expect(await listStoryInvitations(client, STORY_ID)).toHaveLength(1);
    expect(await listCollaborators(client, STORY_ID)).toHaveLength(1);
    expect(c.rpcCalls).toEqual([
      { name: "invite_collaborator", args: { p_story_id: STORY_ID, p_username: "cuong", p_role: "co_author" } },
      { name: "respond_invitation", args: { p_invitation_id: INV_ID, p_accept: true } },
      { name: "respond_invitation", args: { p_invitation_id: INV_ID, p_accept: false } },
      { name: "cancel_invitation", args: { p_invitation_id: INV_ID } },
      { name: "list_my_invitations", args: {} },
      { name: "list_story_invitations", args: { p_story_id: STORY_ID } },
    ]);
  });

  it("removes by story and user, and treats zero removed rows as not found", async () => {
    const c = fakeClient();
    await removeCollaborator(c as unknown as DataClient, STORY_ID, USER_B);
    expect(c.deletes[0]?.eq).toEqual([
      ["story_id", STORY_ID],
      ["user_id", USER_B],
    ]);
    const none = fakeClient({ deleteResult: { data: [], error: null } });
    await expect(removeCollaborator(none as unknown as DataClient, STORY_ID, USER_B)).rejects.toMatchObject({
      kind: "notFound",
    });
  });

  it("surfaces an RPC error with its kind", async () => {
    const c = fakeClient({ rpc: () => ({ data: null, error: { code: "PT409", message: "already a collaborator" } }) });
    await expect(inviteCollaborator(c as unknown as DataClient, STORY_ID, "x", "editor")).rejects.toMatchObject({
      kind: "conflict",
    });
  });
});

const adapter: PlatformAdapter = {
  platform: "web",
  isNative: false,
  Link: ({ href, replace: _r, children, ...rest }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useNavigation: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/studio" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};
const toasts = { show: vi.fn() };

function renderWith(c: ReturnType<typeof fakeClient>, ui: React.ReactNode) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={withAuth(c, testSession())}>
        <AuthProvider>
          <PlatformProvider adapter={adapter}>
            <ToastProvider port={toasts}>{ui}</ToastProvider>
          </PlatformProvider>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => toasts.show.mockClear());

describe("TeamScreen", () => {
  it("lists collaborators and invitations with their state", async () => {
    renderWith(
      fakeClient({
        members: [memberRow()],
        sent: [
          sentRow(),
          sentRow({ id: "x2", status: "declined", invitee_username: "dung", invitee_display_name: "Dũng" }),
        ],
      }),
      <TeamScreen storyId={STORY_ID} />,
    );
    const members = await screen.findByRole("list", { name: t.currentLabel });
    expect(within(members).getByText("Bình")).toBeTruthy();
    expect(within(members).getByText("@binh")).toBeTruthy();
    const sent = screen.getByRole("list", { name: t.pendingLabel });
    expect(within(sent).getByText(t.status.pending)).toBeTruthy();
    expect(within(sent).getByText(t.status.declined)).toBeTruthy();
    // only a pending invitation can be cancelled
    expect(within(sent).getAllByRole("button", { name: t.cancelInvitation })).toHaveLength(1);
  });

  it("is closed to a collaborator who does not own the story", async () => {
    const c = fakeClient({ owner: false, members: [memberRow()] });
    renderWith(c, <TeamScreen storyId={STORY_ID} />);
    expect(await screen.findByText(t.onlyOwner.title)).toBeTruthy();
    expect(screen.queryByLabelText(t.invite.username)).toBeNull();
    expect(c.rpcCalls.filter((call) => call.name === "list_story_invitations")).toHaveLength(0);
  });

  it("invites by username and role, clears the field and reloads the invitations", async () => {
    const c = fakeClient();
    renderWith(c, <TeamScreen storyId={STORY_ID} />);
    const input = await screen.findByLabelText(t.invite.username);
    fireEvent.change(input, { target: { value: " cuong " } });
    fireEvent.click(screen.getByRole("button", { name: t.invite.submit }));
    await waitFor(() => expect(c.rpcCalls.some((call) => call.name === "invite_collaborator")).toBe(true));
    expect(c.rpcCalls.find((call) => call.name === "invite_collaborator")?.args).toEqual({
      p_story_id: STORY_ID,
      p_username: "cuong",
      p_role: "editor",
    });
    await waitFor(() => expect((screen.getByLabelText(t.invite.username) as HTMLInputElement).value).toBe(""));
    expect(toasts.show).toHaveBeenCalledWith("success", t.invite.sent);
    await waitFor(() =>
      expect(c.rpcCalls.filter((call) => call.name === "list_story_invitations").length).toBeGreaterThan(1),
    );
  });

  it("asks for a name before sending anything", async () => {
    const c = fakeClient();
    renderWith(c, <TeamScreen storyId={STORY_ID} />);
    await screen.findByLabelText(t.invite.username);
    fireEvent.click(screen.getByRole("button", { name: t.invite.submit }));
    expect(await screen.findByText(t.invite.usernameRequired)).toBeTruthy();
    expect(c.rpcCalls.some((call) => call.name === "invite_collaborator")).toBe(false);
  });

  it("shows why an invite was refused next to the field and keeps what was typed", async () => {
    const c = fakeClient({
      rpc: (name) =>
        name === "invite_collaborator"
          ? { data: null, error: { code: "PT404", message: "user not found" } }
          : (undefined as never),
    });
    renderWith(c, <TeamScreen storyId={STORY_ID} />);
    fireEvent.change(await screen.findByLabelText(t.invite.username), { target: { value: "ghost" } });
    fireEvent.click(screen.getByRole("button", { name: t.invite.submit }));
    expect(await screen.findByText(t.errors.inviteNotFound)).toBeTruthy();
    expect((screen.getByLabelText(t.invite.username) as HTMLInputElement).value).toBe("ghost");
  });

  it("cancels a pending invitation", async () => {
    const c = fakeClient({ sent: [sentRow()] });
    renderWith(c, <TeamScreen storyId={STORY_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: t.cancelInvitation }));
    await waitFor(() =>
      expect(c.rpcCalls.find((call) => call.name === "cancel_invitation")?.args).toEqual({ p_invitation_id: INV_ID }),
    );
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("success", t.invitationCancelled));
  });

  it("removes a collaborator only after confirmation", async () => {
    const c = fakeClient({ members: [memberRow()] });
    renderWith(c, <TeamScreen storyId={STORY_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: t.remove }));
    expect(c.deletes).toHaveLength(0);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: t.remove }));
    await waitFor(() => expect(c.deletes).toHaveLength(1));
    expect(c.deletes[0]?.eq).toEqual([
      ["story_id", STORY_ID],
      ["user_id", USER_B],
    ]);
  });
});

describe("MyInvitations", () => {
  it("renders nothing without invitations", async () => {
    const c = fakeClient();
    renderWith(c, <MyInvitations />);
    await waitFor(() => expect(c.rpcCalls.some((call) => call.name === "list_my_invitations")).toBe(true));
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("shows who invited me to what, and accepts", async () => {
    const c = fakeClient({ mine: [mineRow()] });
    renderWith(c, <MyInvitations />);
    const list = await screen.findByRole("list", { name: studioText.invitations.listLabel });
    expect(within(list).getByText("Truyện kín")).toBeTruthy();
    expect(within(list).getByText(studioText.invitations.from("An", studioText.role.editor))).toBeTruthy();
    fireEvent.click(within(list).getByRole("button", { name: studioText.invitations.accept }));
    await waitFor(() =>
      expect(c.rpcCalls.find((call) => call.name === "respond_invitation")?.args).toEqual({
        p_invitation_id: INV_ID,
        p_accept: true,
      }),
    );
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("success", studioText.invitations.accepted));
  });

  it("declines, and explains a stale invitation", async () => {
    const c = fakeClient({ mine: [mineRow()] });
    renderWith(c, <MyInvitations />);
    fireEvent.click(await screen.findByRole("button", { name: studioText.invitations.decline }));
    await waitFor(() =>
      expect(c.rpcCalls.find((call) => call.name === "respond_invitation")?.args).toEqual({
        p_invitation_id: INV_ID,
        p_accept: false,
      }),
    );
    cleanup();

    const stale = fakeClient({
      mine: [mineRow()],
      rpc: (name) =>
        name === "respond_invitation"
          ? { data: null, error: { code: "PT409", message: "no longer pending" } }
          : (undefined as never),
    });
    renderWith(stale, <MyInvitations />);
    fireEvent.click(await screen.findByRole("button", { name: studioText.invitations.accept }));
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("error", t.errors.settled));
  });
});
