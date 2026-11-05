import { toast } from "sonner";
import type { ToastPort } from "@storynest/features";

/** Renders shared-code toasts with Sonner (the <Toaster /> is mounted in app/providers.tsx). */
export const sonnerToastPort: ToastPort = {
  show(kind, message, options) {
    const action = options?.action;
    if (!action) return void toast[kind](message);
    toast[kind](message, { action: { label: action.label, onClick: () => action.onClick() } });
  },
};
