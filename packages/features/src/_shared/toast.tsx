"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

export type ToastKind = "success" | "error" | "info";

/** What the host app renders toasts with (sonner in apps/web, see WBS WP 0.5). Messages are already translated. */
export interface ToastPort {
  show(kind: ToastKind, message: string): void;
}

export interface AppToast {
  success(message: string): void;
  error(message: string): void;
  info(message: string): void;
}

const ToastContext = createContext<ToastPort | undefined>(undefined);

export function ToastProvider({ port, children }: { port: ToastPort; children: ReactNode }) {
  return <ToastContext value={port}>{children}</ToastContext>;
}

/** Fails loudly without a provider: a silently dropped error message is worse than a crash in development. */
export function useAppToast(): AppToast {
  const port = useContext(ToastContext);
  if (port === undefined) throw new Error("useAppToast must be used inside <ToastProvider>.");
  return useMemo(
    () => ({
      success: (message) => port.show("success", message),
      error: (message) => port.show("error", message),
      info: (message) => port.show("info", message),
    }),
    [port],
  );
}
