"use client";

import { useQuery } from "@tanstack/react-query";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { getRoleRights } from "../api/role-rights.api.ts";
import { studioKeys } from "../keys.ts";
import type { RoleRight } from "../model/role-rights.ts";

/** The role rights change only with a migration: one read per session is enough. */
export function useRoleRights() {
  const getClient = useDataClientGetter();
  return useQuery<RoleRight[], AppError>({
    queryKey: studioKeys.roleRights,
    queryFn: () => getRoleRights(getClient()).catch((e: unknown) => Promise.reject(toAppError(e))),
    staleTime: Infinity,
  });
}
