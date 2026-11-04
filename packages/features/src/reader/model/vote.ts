import type { AppError } from "../../_shared/errors.ts";
import { readerText } from "../strings.ts";

/** What the vote button shows: whether I voted and how many votes the chapter has. */
export interface VoteState {
  voted: boolean;
  votes: number;
}

/** The state the screen shows at once while the server is still answering. Never below zero; no change if already so. */
export function withVote(state: VoteState, voted: boolean): VoteState {
  if (state.voted === voted) return state;
  return { voted, votes: Math.max(0, state.votes + (voted ? 1 : -1)) };
}

/** The count the server returns is the truth: it replaces the guess, and my own state follows what I asked for. */
export function settledVote(voted: boolean, serverVotes: number): VoteState {
  return { voted, votes: Math.max(0, serverVotes) };
}

export function voteErrorMessage(error: AppError): string {
  switch (error.kind) {
    case "forbidden":
      return readerText.vote.errors.forbidden;
    case "network":
      return readerText.vote.errors.network;
    default:
      return readerText.vote.errors.generic;
  }
}
