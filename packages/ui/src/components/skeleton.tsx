/* Shimmer streak adapted from Lucian UX/UI Prompt #079 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#079 */ // token-check-ignore: element number in the license line, not a colour
import { cn } from "../lib/utils.ts";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("skeleton-shine animate-skeleton-shine rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
