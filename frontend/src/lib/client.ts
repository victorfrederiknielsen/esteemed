import { EstimationService } from "@/gen/esteemed/v1/estimation_connect";
import { RoomService } from "@/gen/esteemed/v1/room_connect";
import { createPromiseClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { generateParticipantName } from "./namegen";

// Create transport for Connect protocol with JSON
const transport = createConnectTransport({
  baseUrl: window.location.origin,
  useBinaryFormat: false, // Use JSON instead of binary protobuf
});

// Create typed clients
export const roomClient = createPromiseClient(RoomService, transport);
export const estimationClient = createPromiseClient(
  EstimationService,
  transport,
);

// Global identity storage - single token and name that follows user everywhere
const IDENTITY_KEY = "esteemed_identity";
const ROOM_PARTICIPANTS_KEY = "esteemed_room_participants";
const OLD_SESSIONS_KEY = "esteemed_sessions"; // For migration cleanup

export interface UserIdentity {
  token: string; // Single global token (generated once via crypto.randomUUID())
  generatedName: string; // Auto-generated "Gentle Deer" style name
  customName?: string; // User's custom override (optional)
}

// Room → participantId mapping (for local state tracking)
type RoomParticipantMap = Record<string, string>;

// Migration: clear old per-room sessions on first load
function migrateOldSessions(): void {
  if (localStorage.getItem(OLD_SESSIONS_KEY)) {
    localStorage.removeItem(OLD_SESSIONS_KEY);
  }
}

// Get or create the global user identity
export function getOrCreateIdentity(): UserIdentity {
  migrateOldSessions();

  const stored = localStorage.getItem(IDENTITY_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Invalid JSON, create new identity
    }
  }

  // Create new identity
  const identity: UserIdentity = {
    token: crypto.randomUUID(),
    generatedName: generateParticipantName(),
  };

  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  return identity;
}

// Get the global session token
export function getGlobalToken(): string {
  return getOrCreateIdentity().token;
}

// Get the display name (custom name if set, otherwise generated name)
export function getDisplayName(): string {
  const identity = getOrCreateIdentity();
  return identity.customName || identity.generatedName;
}

// Set a custom name (persists across rooms)
export function setCustomName(name: string): void {
  const identity = getOrCreateIdentity();
  identity.customName = name.trim() || undefined;
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

// Room participant ID storage (tracks which participantId we have in each room)
function loadRoomParticipants(): RoomParticipantMap {
  const stored = localStorage.getItem(ROOM_PARTICIPANTS_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

function saveRoomParticipants(map: RoomParticipantMap): void {
  localStorage.setItem(ROOM_PARTICIPANTS_KEY, JSON.stringify(map));
}

export function saveRoomParticipantId(
  roomId: string,
  participantId: string,
): void {
  const map = loadRoomParticipants();
  map[roomId] = participantId;
  saveRoomParticipants(map);
}

export function getRoomParticipantId(roomId: string): string | null {
  const map = loadRoomParticipants();
  return map[roomId] || null;
}

export function clearRoomParticipantId(roomId: string): void {
  const map = loadRoomParticipants();
  delete map[roomId];
  saveRoomParticipants(map);
}
