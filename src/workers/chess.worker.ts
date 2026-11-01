/// <reference lib="webworker" />

/* The computer's move, off the main thread, so a deep search never freezes the board. */
import { chooseMove, type ChessMove, type ChessState } from "@/lib/chess";

export interface ChessRequest {
  id: number;
  state: ChessState;
  depth: number;
  noise: number;
}

export interface ChessResponse {
  id: number;
  move: ChessMove | null;
}

self.onmessage = ({ data }: MessageEvent<ChessRequest>) => {
  const response: ChessResponse = { id: data.id, move: chooseMove(data.state, data.depth, data.noise) };
  self.postMessage(response);
};
