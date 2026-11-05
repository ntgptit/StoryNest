// Public API of the "share" feature: a Share button and dialog (copy link, system share sheet) for any page.
export { ShareButton } from "./components/share-button.tsx";
export { canShareNatively, shareNatively, shareUrl } from "./model/share-url.ts";
export { shareText } from "./strings.ts";
