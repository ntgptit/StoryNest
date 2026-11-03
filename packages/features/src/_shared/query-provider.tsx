"use client";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { createQueryClient, type QueryClientOptions } from "./query.ts";

/**
 * One QueryClient per mounted provider (never a module-level singleton: on the server a shared client would leak
 * data between requests). Pass `client` to reuse one, e.g. in tests.
 */
export function QueryProvider({
  client,
  options,
  children,
}: {
  client?: QueryClient;
  options?: QueryClientOptions;
  children: ReactNode;
}) {
  const [created] = useState(() => client ?? createQueryClient(options));
  return <QueryClientProvider client={created}>{children}</QueryClientProvider>;
}
