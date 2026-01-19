import { AnalyticsService } from "@/gen/esteemed/v1/analytics_connect";
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
export const analyticsClient = createPromiseClient(AnalyticsService, transport);

// Global identity storage - single token and name that follows user everywhere
const IDENTITY_KEY = "esteemed_identity";
const ROOM_PARTICIPANTS_KEY = "esteemed_room_participants";
const RECENT_ROOMS_KEY = "esteemed_recent_rooms";
const OLD_SESSIONS_KEY = "esteemed_sessions"; // For migration cleanup

export interface UserIdentity {
  token: string; // Single global token (generated once via crypto.randomUUID())
  generatedName: string; // Auto-generated "Gentle Deer" style name
  customName?: string; // User's custom override (optional)
}

// Room → participantId mapping (for reconnection)
type RoomParticipantMap = Record<string, string>;

// Room → lastVisited timestamp (for recent rooms display)
type RecentRoomsMap = Record<string, number>;

// Recent room entry for display
export interface RecentRoom {
  name: string;
  lastVisited: number;
}

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

// Room participant ID storage (tracks which participantId we have in each room for reconnection)
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
  // Also track this room visit
  updateRoomVisit(roomId);
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

// Recent rooms storage (tracks visit timestamps for history display)
function loadRecentRooms(): RecentRoomsMap {
  const stored = localStorage.getItem(RECENT_ROOMS_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

function saveRecentRoomsMap(map: RecentRoomsMap): void {
  localStorage.setItem(RECENT_ROOMS_KEY, JSON.stringify(map));
}

// Update the lastVisited timestamp for a room
export function updateRoomVisit(roomName: string): void {
  const map = loadRecentRooms();
  map[roomName] = Date.now();
  saveRecentRoomsMap(map);
}

// Get recently visited rooms sorted by most recent, limited to last 7 days
export function getRecentRooms(limit = 5): RecentRoom[] {
  const map = loadRecentRooms();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return Object.entries(map)
    .filter(([, timestamp]) => timestamp > sevenDaysAgo)
    .map(([name, timestamp]) => ({
      name,
      lastVisited: timestamp,
    }))
    .sort((a, b) => b.lastVisited - a.lastVisited)
    .slice(0, limit);
}

// Format relative time for display
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  return `${diffDays}d ago`;
}
