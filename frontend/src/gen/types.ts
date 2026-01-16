// Generated types - regenerate with: buf generate
// This is a stub file for development

export const RoomState = {
  UNSPECIFIED: 0,
  WAITING: 1,
  VOTING: 2,
  REVEALED: 3,
} as const;
export type RoomState = (typeof RoomState)[keyof typeof RoomState];

export const CardValue = {
  UNSPECIFIED: 0,
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FIVE: 4,
  EIGHT: 5,
  THIRTEEN: 6,
  TWENTY_ONE: 7,
  QUESTION: 8,
  COFFEE: 9,
} as const;
export type CardValue = (typeof CardValue)[keyof typeof CardValue];

export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
  joinedAt: bigint;
}

export interface Room {
  id: string;
  name: string;
  participants: Participant[];
  state: RoomState;
  currentTopic: string;
  createdAt: bigint;
}

export interface Vote {
  participantId: string;
  participantName: string;
  value: CardValue;
  hasVoted: boolean;
}

export interface VoteSummary {
  votes: Vote[];
  average: CardValue;
  mode: CardValue;
  hasConsensus: boolean;
}

// Request/Response types
export interface CreateRoomRequest {
  hostName: string;
}

export interface CreateRoomResponse {
  room?: Room;
  sessionToken: string;
  participantId: string;
}

export interface JoinRoomRequest {
  roomId: string;
  participantName: string;
  sessionToken?: string;
}

export interface JoinRoomResponse {
  room?: Room;
  sessionToken: string;
  participantId: string;
}

export interface LeaveRoomRequest {
  roomId: string;
  participantId: string;
  sessionToken: string;
}

export interface LeaveRoomResponse {}

export interface GetRoomRequest {
  roomId: string;
}

export interface GetRoomResponse {
  room?: Room;
}

export interface WatchRoomRequest {
  roomId: string;
  sessionToken: string;
}

export interface CastVoteRequest {
  roomId: string;
  participantId: string;
  sessionToken: string;
  value: CardValue;
}

export interface CastVoteResponse {}

export interface RevealVotesRequest {
  roomId: string;
  participantId: string;
  sessionToken: string;
}

export interface RevealVotesResponse {
  summary?: VoteSummary;
}

export interface ResetRoundRequest {
  roomId: string;
  participantId: string;
  sessionToken: string;
}

export interface ResetRoundResponse {}

export interface SetTopicRequest {
  roomId: string;
  participantId: string;
  sessionToken: string;
  topic: string;
}

export interface SetTopicResponse {}

export interface WatchVotesRequest {
  roomId: string;
  sessionToken: string;
}

// Event types
export interface ParticipantJoined {
  participant?: Participant;
}

export interface ParticipantLeft {
  participantId: string;
}

export interface RoomStateChanged {
  newState: RoomState;
}

export interface TopicChanged {
  topic: string;
}

export interface RoomClosed {
  reason: string;
}

export interface RoomEvent {
  event:
    | { case: "participantJoined"; value: ParticipantJoined }
    | { case: "participantLeft"; value: ParticipantLeft }
    | { case: "stateChanged"; value: RoomStateChanged }
    | { case: "topicChanged"; value: TopicChanged }
    | { case: "roomClosed"; value: RoomClosed }
    | { case: undefined; value?: undefined };
}

export interface VoteCast {
  participantId: string;
  participantName: string;
}

export interface VotesRevealed {
  summary?: VoteSummary;
}

export interface RoundReset {}

export interface VoteEvent {
  event:
    | { case: "voteCast"; value: VoteCast }
    | { case: "votesRevealed"; value: VotesRevealed }
    | { case: "roundReset"; value: RoundReset }
    | { case: undefined; value?: undefined };
}

// Card value helpers
export const CARD_VALUES = [
  { value: CardValue.ONE, label: "1", numeric: 1 },
  { value: CardValue.TWO, label: "2", numeric: 2 },
  { value: CardValue.THREE, label: "3", numeric: 3 },
  { value: CardValue.FIVE, label: "5", numeric: 5 },
  { value: CardValue.EIGHT, label: "8", numeric: 8 },
  { value: CardValue.THIRTEEN, label: "13", numeric: 13 },
  { value: CardValue.TWENTY_ONE, label: "21", numeric: 21 },
  { value: CardValue.QUESTION, label: "?", numeric: null },
  { value: CardValue.COFFEE, label: "\u2615", numeric: null },
] as const;

export function cardValueToLabel(value: CardValue): string {
  const card = CARD_VALUES.find((c) => c.value === value);
  return card?.label ?? "";
}
