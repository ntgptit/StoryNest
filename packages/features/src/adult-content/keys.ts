// Query keys of the adult-content feature. The choice itself lives on the device (model/store.ts); the account copy
// is read once per sign-in by the sync hook.
export const adultContentKeys = {
  all: ["adult-content"] as const,
  remote: (userId: string) => ["adult-content", "remote", userId] as const,
};
