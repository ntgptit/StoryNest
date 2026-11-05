// Error contract of the RPCs: 42501 forbidden, PT404 not found, PT409 conflict, 22023 invalid input, PT429 too many requests.
// No zod here on purpose: classifyRpcError is used by the error mapping that every data hook goes through, so this
// module is in every route's bundle (the argument schemas stay in rpc.ts).

/** SQLSTATEs raised by the RPCs. */
export const RPC_ERROR = {
  forbidden: "42501",
  notFound: "PT404",
  conflict: "PT409",
  invalid: "22023",
  rateLimited: "PT429",
} as const;
export type RpcErrorKind = keyof typeof RPC_ERROR;

export function classifyRpcError(code: string | null | undefined): RpcErrorKind | "unknown" {
  const hit = (Object.entries(RPC_ERROR) as [RpcErrorKind, string][]).find(([, c]) => c === code);
  return hit ? hit[0] : "unknown";
}
