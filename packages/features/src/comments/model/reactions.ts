import { COMMENT_REACTION, type CommentReaction } from "@storynest/validation";

/** The emoji drawn for each reaction code, in the order of the picker (the like stays the heart button). */
export const REACTION_EMOJI: Record<CommentReaction, string> = {
  [COMMENT_REACTION.THUMBS_UP]: "👍",
  [COMMENT_REACTION.LAUGH]: "😂",
  [COMMENT_REACTION.WOW]: "😮",
  [COMMENT_REACTION.SAD]: "😢",
  [COMMENT_REACTION.FIRE]: "🔥",
  [COMMENT_REACTION.CLAP]: "👏",
};
