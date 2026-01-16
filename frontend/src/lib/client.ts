import { EstimationService } from "@/gen/esteemed/v1/estimation_connect";
import { RoomService } from "@/gen/esteemed/v1/room_connect";
import { createPromiseClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";

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
