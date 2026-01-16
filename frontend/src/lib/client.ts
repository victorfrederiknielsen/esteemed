import type {
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  LeaveRoomRequest,
  LeaveRoomResponse,
  GetRoomRequest,
  GetRoomResponse,
  WatchRoomRequest,
  RoomEvent,
  CastVoteRequest,
  CastVoteResponse,
  RevealVotesRequest,
  RevealVotesResponse,
  ResetRoundRequest,
  ResetRoundResponse,
  SetTopicRequest,
  SetTopicResponse,
  WatchVotesRequest,
  VoteEvent,
} from "@/gen/types";

const BASE_URL = "";

async function callUnary<Req, Res>(service: string, method: string, request: Req): Promise<Res> {
  const response = await fetch(`${BASE_URL}/${service}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Connect-Protocol-Version": "1",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function* streamServerSide<Req, Res>(
  service: string,
  method: string,
  request: Req,
  signal?: AbortSignal
): AsyncGenerator<Res> {
  const response = await fetch(`${BASE_URL}/${service}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Connect-Protocol-Version": "1",
      "Connect-Accept-Encoding": "identity",
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Stream failed" }));
    throw new Error(error.message || `${response.status}: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse NDJSON (newline-delimited JSON)
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.trim()) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.result) {
            yield parsed.result as Res;
          }
        } catch {
          // Skip invalid JSON lines
        }
      }
    }
  }

  // Process any remaining buffer
  if (buffer.trim()) {
    try {
      const parsed = JSON.parse(buffer);
      if (parsed.result) {
        yield parsed.result as Res;
      }
    } catch {
      // Skip invalid JSON
    }
  }
}

// Room Service Client
export const roomClient = {
  createRoom: (request: CreateRoomRequest) =>
    callUnary<CreateRoomRequest, CreateRoomResponse>("esteemed.v1.RoomService", "CreateRoom", request),

  joinRoom: (request: JoinRoomRequest) =>
    callUnary<JoinRoomRequest, JoinRoomResponse>("esteemed.v1.RoomService", "JoinRoom", request),

  leaveRoom: (request: LeaveRoomRequest) =>
    callUnary<LeaveRoomRequest, LeaveRoomResponse>("esteemed.v1.RoomService", "LeaveRoom", request),

  getRoom: (request: GetRoomRequest) =>
    callUnary<GetRoomRequest, GetRoomResponse>("esteemed.v1.RoomService", "GetRoom", request),

  watchRoom: (request: WatchRoomRequest, options?: { signal?: AbortSignal }) =>
    streamServerSide<WatchRoomRequest, RoomEvent>("esteemed.v1.RoomService", "WatchRoom", request, options?.signal),
};

// Estimation Service Client
export const estimationClient = {
  castVote: (request: CastVoteRequest) =>
    callUnary<CastVoteRequest, CastVoteResponse>("esteemed.v1.EstimationService", "CastVote", request),

  revealVotes: (request: RevealVotesRequest) =>
    callUnary<RevealVotesRequest, RevealVotesResponse>("esteemed.v1.EstimationService", "RevealVotes", request),

  resetRound: (request: ResetRoundRequest) =>
    callUnary<ResetRoundRequest, ResetRoundResponse>("esteemed.v1.EstimationService", "ResetRound", request),

  setTopic: (request: SetTopicRequest) =>
    callUnary<SetTopicRequest, SetTopicResponse>("esteemed.v1.EstimationService", "SetTopic", request),

  watchVotes: (request: WatchVotesRequest, options?: { signal?: AbortSignal }) =>
    streamServerSide<WatchVotesRequest, VoteEvent>("esteemed.v1.EstimationService", "WatchVotes", request, options?.signal),
};

// Session storage helpers
const SESSION_KEY = "esteemed_session";

export interface SessionData {
  roomId: string;
  participantId: string;
  sessionToken: string;
}

export function saveSession(data: SessionData): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function loadSession(): SessionData | null {
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
