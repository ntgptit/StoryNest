// Public API of the "adult-content" feature: the reader's choice about 18+ stories and the gate in front of them.
export { AdultContentButton } from "./components/adult-content-button.tsx";
export { AdultContentSync } from "./components/adult-content-sync.tsx";
export { AdultGate } from "./components/adult-gate.tsx";
export { useAdultContent, useShowMature } from "./hooks/use-adult-content.ts";
export { ADULT_CONTENT_STORAGE_KEY, parseAdultContent } from "./model/store.ts";
export { adultContentText } from "./strings.ts";
export { adultContentKeys } from "./keys.ts";
