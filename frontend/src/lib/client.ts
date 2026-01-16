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
} from "@/gen/esteemed/v1/room_pb";

import type {
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
} from "@/gen/esteemed/v1/estimation_pb";

import { fromJson, type DescMessage } from "@bufbuild/protobuf";
import {
  CreateRoomResponseSchema,
  JoinRoomResponseSchema,
  LeaveRoomResponseSchema,
  GetRoomResponseSchema,
  RoomEventSchema,
} from "@/gen/esteemed/v1/room_pb";

import {
  CastVoteResponseSchema,
  RevealVotesResponseSchema,
  ResetRoundResponseSchema,
  SetTopicResponseSchema,
  VoteEventSchema,
} from "@/gen/esteemed/v1/estimation_pb";

const BASE_URL = "";

// Generic unary call using Connect JSON protocol
async function callUnary<Res>(
  service: string,
  method: string,
  request: object,
  responseSchema: DescMessage
): Promise<Res> {
  const response = await fetch(`${BASE_URL}/${service}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `${response.status}: ${response.statusText}`);
  }

  const json = await response.json();
  return fromJson(responseSchema, json) as Res;
}

// Server streaming using Connect JSON protocol
async function* streamServerSide<Res>(
  service: string,
  method: string,
  request: object,
  responseSchema: DescMessage,
  signal?: AbortSignal
): AsyncGenerator<Res> {
  const response = await fetch(`${BASE_URL}/${service}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/connect+json",
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
            yield fromJson(responseSchema, parsed.result) as Res;
          }
        } catch {
          // Skip invalid JSON lines
        }
      }
    }
  }
}

// Room Service Client
export const roomClient = {
  createRoom: (request: Partial<CreateRoomRequest>) =>
    callUnary<CreateRoomResponse>(
      "esteemed.v1.RoomService",
      "CreateRoom",
      request,
      CreateRoomResponseSchema
    ),

  joinRoom: (request: Partial<JoinRoomRequest>) =>
    callUnary<JoinRoomResponse>(
      "esteemed.v1.RoomService",
      "JoinRoom",
      request,
      JoinRoomResponseSchema
    ),

  leaveRoom: (request: Partial<LeaveRoomRequest>) =>
    callUnary<LeaveRoomResponse>(
      "esteemed.v1.RoomService",
      "LeaveRoom",
      request,
      LeaveRoomResponseSchema
    ),

  getRoom: (request: Partial<GetRoomRequest>) =>
    callUnary<GetRoomResponse>(
      "esteemed.v1.RoomService",
      "GetRoom",
      request,
      GetRoomResponseSchema
    ),

  watchRoom: (request: Partial<WatchRoomRequest>, options?: { signal?: AbortSignal }) =>
    streamServerSide<RoomEvent>(
      "esteemed.v1.RoomService",
      "WatchRoom",
      request,
      RoomEventSchema,
      options?.signal
    ),
};

// Estimation Service Client
export const estimationClient = {
  castVote: (request: Partial<CastVoteRequest>) =>
    callUnary<CastVoteResponse>(
      "esteemed.v1.EstimationService",
      "CastVote",
      request,
      CastVoteResponseSchema
    ),

  revealVotes: (request: Partial<RevealVotesRequest>) =>
    callUnary<RevealVotesResponse>(
      "esteemed.v1.EstimationService",
      "RevealVotes",
      request,
      RevealVotesResponseSchema
    ),

  resetRound: (request: Partial<ResetRoundRequest>) =>
    callUnary<ResetRoundResponse>(
      "esteemed.v1.EstimationService",
      "ResetRound",
      request,
      ResetRoundResponseSchema
    ),

  setTopic: (request: Partial<SetTopicRequest>) =>
    callUnary<SetTopicResponse>(
      "esteemed.v1.EstimationService",
      "SetTopic",
      request,
      SetTopicResponseSchema
    ),

  watchVotes: (request: Partial<WatchVotesRequest>, options?: { signal?: AbortSignal }) =>
    streamServerSide<VoteEvent>(
      "esteemed.v1.EstimationService",
      "WatchVotes",
      request,
      VoteEventSchema,
      options?.signal
    ),
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
