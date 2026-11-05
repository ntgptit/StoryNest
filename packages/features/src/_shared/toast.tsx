"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

export type ToastKind = "success" | "error" | "info";

/** A button in the toast, e.g. "Undo". The label is already translated. */
export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  action?: ToastAction | undefined;
}

/** What the host app renders toasts with (sonner in apps/web, see WBS WP 0.5). Messages are already translated. */
export interface ToastPort {
  show(kind: ToastKind, message: string, options?: ToastOptions): void;
}

export interface AppToast {
  success(message: string, options?: ToastOptions): void;
  error(message: string, options?: ToastOptions): void;
  info(message: string, options?: ToastOptions): void;
}

const ToastContext = createContext<ToastPort | undefined>(undefined);

export function ToastProvider({ port, children }: { port: ToastPort; children: ReactNode }) {
  return <ToastContext value={port}>{children}</ToastContext>;
}

/** Fails loudly without a provider: a silently dropped error message is worse than a crash in development. */
export function useAppToast(): AppToast {
  const port = useContext(ToastContext);
  if (port === undefined) throw new Error("useAppToast must be used inside <ToastProvider>.");
  return useMemo(() => {
    // Options are passed on only when given, so ports (and tests) that take two arguments still see two.
    const show = (kind: ToastKind, message: string, options?: ToastOptions) =>
      options ? port.show(kind, message, options) : port.show(kind, message);
    return {
      success: (message, options) => show("success", message, options),
      error: (message, options) => show("error", message, options),
      info: (message, options) => show("info", message, options),
    };
  }, [port]);
}
