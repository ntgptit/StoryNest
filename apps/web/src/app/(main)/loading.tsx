import { RouteLoading } from "@storynest/features";

/**
 * Loading boundary of every regular page. The pages are dynamic (session, params, server prefetch), so without it a
 * click shows nothing until the whole server render is back; with it Next prefetches the layout and this
 * placeholder, switches to it at once and streams the page in.
 */
export default function Loading() {
  return <RouteLoading />;
}
