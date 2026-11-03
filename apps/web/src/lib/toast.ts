import { toast } from "sonner";
import type { ToastPort } from "@storynest/features";

/** Renders shared-code toasts with Sonner (the <Toaster /> is mounted in app/providers.tsx). */
export const sonnerToastPort: ToastPort = {
  show(kind, message) {
    toast[kind](message);
  },
};
