"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { toAppError, type AppError } from "./errors.ts";

interface Props {
  /** Rendered instead of the failed subtree. `reset` clears the error and re-renders the children. */
  fallback: (error: AppError, reset: () => void) => ReactNode;
  /** Logging hook (Sentry etc., WBS 8.2). */
  onError?: (error: AppError, info: ErrorInfo) => void;
  /** When any of these values change the boundary resets itself (e.g. the route or the story id). */
  resetKeys?: readonly unknown[];
  children: ReactNode;
}

interface State {
  error: AppError | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: toAppError(error) };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    this.props.onError?.(toAppError(error), info);
  }

  override componentDidUpdate(prev: Props) {
    const { resetKeys } = this.props;
    if (this.state.error && resetKeys && changed(prev.resetKeys, resetKeys)) this.reset();
  }

  reset = () => this.setState({ error: null });

  override render() {
    return this.state.error ? this.props.fallback(this.state.error, this.reset) : this.props.children;
  }
}

function changed(a: readonly unknown[] | undefined, b: readonly unknown[]): boolean {
  return a === undefined || a.length !== b.length || a.some((value, i) => !Object.is(value, b[i]));
}
