import type { CardConfig, Participant, Room } from "@/gen/esteemed/v1/room_pb";
import { RoomState } from "@/gen/esteemed/v1/room_pb";
import {
  clearRoomParticipantId,
  estimationClient,
  getGlobalToken,
  getRoomParticipantId,
  roomClient,
  saveRoomParticipantId,
} from "@/lib/client";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseRoomState {
  room: Room | null;
  participants: Participant[];
  currentParticipantId: string | null;
  sessionToken: string | null;
  isHost: boolean;
  isSpectator: boolean;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UseRoomActions {
  createRoom: (hostName: string, cardConfig?: CardConfig) => Promise<string>;
  joinRoom: (
    roomId: string,
    participantName: string,
    isSpectator?: boolean,
  ) => Promise<void>;
  leaveRoom: () => Promise<void>;
  startRound: () => Promise<void>;
  kickParticipant: (targetId: string) => Promise<void>;
  transferOwnership: (newHostId: string) => Promise<void>;
}

export function useRoom(roomId?: string): UseRoomState & UseRoomActions {
  const [state, setState] = useState<UseRoomState>({
    room: null,
    participants: [],
    currentParticipantId: null,
    sessionToken: null,
    isHost: false,
    isSpectator: false,
    isConnected: false,
    isLoading: false,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const joinRoomInternalRef = useRef<typeof joinRoomInternal | null>(null);
  const isLeavingRef = useRef(false); // Track voluntary leave

  // Try to reconnect if we were previously in this room
  useEffect(() => {
    if (!roomId) return;

    // Only auto-reconnect if we have a saved participant ID for this room
    // (meaning we were previously in this room with our current token)
    const savedParticipantId = getRoomParticipantId(roomId);
    if (savedParticipantId && joinRoomInternalRef.current) {
      const globalToken = getGlobalToken();
      // Try to rejoin with global token (empty name will use existing name on reclaim)
      joinRoomInternalRef.current(roomId, "", globalToken);
    }
  }, [roomId]);

  // Start watching room events when connected
  useEffect(() => {
    const roomId = state.room?.id;
    const sessionToken = state.sessionToken;
    if (!roomId || !sessionToken) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const watchRoom = async () => {
      try {
        const stream = roomClient.watchRoom(
          { roomId, sessionToken },
          { signal: controller.signal },
        );

        for await (const event of stream) {
          if (
            event.event?.case === "participantJoined" &&
            event.event.value.participant
          ) {
            const participant = event.event.value.participant;
            setState((prev) => ({
              ...prev,
              participants: [
                ...prev.participants.filter((p) => p.id !== participant.id),
                participant,
              ],
            }));
          } else if (event.event?.case === "participantLeft") {
            const participantId = event.event.value.participantId;
            // Check if current user was kicked (not voluntary leave)
            setState((prev) => {
              if (participantId === prev.currentParticipantId) {
                // Only clear room participant ID if we were kicked (not leaving voluntarily)
                if (!isLeavingRef.current) {
                  clearRoomParticipantId(prev.room?.name ?? "");
                  return {
                    ...prev,
                    room: null,
                    isConnected: false,
                    error: "You have been removed from the room",
                  };
                }
                // Voluntary leave - don't clear, just ignore the event
                return prev;
              }
              return {
                ...prev,
                participants: prev.participants.filter(
                  (p) => p.id !== participantId,
                ),
              };
            });
          } else if (event.event?.case === "hostChanged") {
            const newHostId = event.event.value.newHostId;
            setState((prev) => {
              for (const p of prev.participants) {
                p.isHost = p.id === newHostId;
              }
              return {
                ...prev,
                isHost: prev.currentParticipantId === newHostId,
                participants: [...prev.participants],
              };
            });
          } else if (event.event?.case === "stateChanged") {
            const newState = event.event.value.newState;
            setState((prev) => {
              if (!prev.room) return prev;
              prev.room.state = newState;
              return { ...prev };
            });
          } else if (event.event?.case === "roomClosed") {
            const reason = event.event.value.reason;
            setState((prev) => {
              // Clear room participant ID for this specific room
              clearRoomParticipantId(prev.room?.name ?? "");
              return {
                ...prev,
                room: null,
                isConnected: false,
                error: `Room closed: ${reason}`,
              };
            });
            return; // Don't retry if room is closed
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Watch room error:", err);
          // Retry connection after a delay instead of disconnecting
          retryTimeout = setTimeout(() => {
            if (!controller.signal.aborted) {
              watchRoom();
            }
          }, 2000);
        }
      }
    };

    watchRoom();

    return () => {
      controller.abort();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [state.room, state.sessionToken]);

  const createRoom = useCallback(
    async (hostName: string, cardConfig?: CardConfig): Promise<string> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Use global token from identity
        const globalToken = getGlobalToken();
        const response = await roomClient.createRoom({
          hostName,
          sessionToken: globalToken,
          cardConfig,
        });

        if (response.room) {
          // Store room -> participantId mapping
          saveRoomParticipantId(response.room.name, response.participantId);

          setState({
            room: response.room,
            participants: response.room.participants,
            currentParticipantId: response.participantId,
            sessionToken: globalToken,
            isHost: true,
            isSpectator: false,
            isConnected: true,
            isLoading: false,
            error: null,
          });

          return response.room.name;
        }

        throw new Error("Failed to create room");
      } catch (err) {
        const error =
          err instanceof Error ? err.message : "Failed to create room";
        setState((prev) => ({ ...prev, isLoading: false, error }));
        throw err;
      }
    },
    [],
  );

  const joinRoomInternal = async (
    roomIdOrName: string,
    participantName: string,
    existingToken?: string,
    isSpectator = false,
  ): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Always use the global token
      const globalToken = existingToken || getGlobalToken();
      const response = await roomClient.joinRoom({
        roomId: roomIdOrName,
        participantName,
        sessionToken: globalToken,
        isSpectator,
      });

      if (response.room) {
        // Store room -> participantId mapping
        saveRoomParticipantId(response.room.name, response.participantId);

        const currentParticipant = response.room.participants.find(
          (p) => p.id === response.participantId,
        );

        setState({
          room: response.room,
          participants: response.room.participants,
          currentParticipantId: response.participantId,
          sessionToken: globalToken,
          isHost: currentParticipant?.isHost ?? false,
          isSpectator: currentParticipant?.isSpectator ?? false,
          isConnected: true,
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : "Failed to join room";
      setState((prev) => ({ ...prev, isLoading: false, error }));
      throw err;
    }
  };

  // Keep ref updated so the reconnection effect can use it
  joinRoomInternalRef.current = joinRoomInternal;

  const joinRoom = useCallback(
    async (
      roomIdOrName: string,
      participantName: string,
      isSpectator = false,
    ): Promise<void> => {
      // Always use global token for joining
      const globalToken = getGlobalToken();
      return joinRoomInternalRef.current?.(
        roomIdOrName,
        participantName,
        globalToken,
        isSpectator,
      );
    },
    [],
  );

  const leaveRoom = useCallback(async (): Promise<void> => {
    if (!state.room?.id || !state.currentParticipantId || !state.sessionToken) {
      return;
    }

    try {
      // Mark that we're voluntarily leaving (so we don't clear on participantLeft event)
      isLeavingRef.current = true;

      await roomClient.leaveRoom({
        roomId: state.room.id,
        participantId: state.currentParticipantId,
        sessionToken: state.sessionToken,
      });

      // Don't clear room participant ID - keep it so user can reconnect later
      abortControllerRef.current?.abort();

      setState({
        room: null,
        participants: [],
        currentParticipantId: null,
        sessionToken: null,
        isHost: false,
        isSpectator: false,
        isConnected: false,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error("Leave room error:", err);
    } finally {
      isLeavingRef.current = false;
    }
  }, [state.room?.id, state.currentParticipantId, state.sessionToken]);

  const startRound = useCallback(async (): Promise<void> => {
    if (!state.room?.id || !state.currentParticipantId || !state.sessionToken) {
      return;
    }

    try {
      await estimationClient.startRound({
        roomId: state.room.id,
        participantId: state.currentParticipantId,
        sessionToken: state.sessionToken,
      });
      // Optimistically update local state
      setState((prev) => {
        if (!prev.room) return prev;
        prev.room.state = RoomState.VOTING;
        return { ...prev };
      });
    } catch (err) {
      const error =
        err instanceof Error ? err.message : "Failed to start round";
      setState((prev) => ({ ...prev, error }));
    }
  }, [state.room?.id, state.currentParticipantId, state.sessionToken]);

  const kickParticipant = useCallback(
    async (targetId: string): Promise<void> => {
      if (
        !state.room?.id ||
        !state.currentParticipantId ||
        !state.sessionToken
      ) {
        return;
      }

      try {
        await roomClient.kickParticipant({
          roomId: state.room.id,
          participantId: state.currentParticipantId,
          sessionToken: state.sessionToken,
          targetParticipantId: targetId,
        });
        // The participantLeft event will update the state
      } catch (err) {
        const error =
          err instanceof Error ? err.message : "Failed to remove participant";
        setState((prev) => ({ ...prev, error }));
      }
    },
    [state.room?.id, state.currentParticipantId, state.sessionToken],
  );

  const transferOwnership = useCallback(
    async (newHostId: string): Promise<void> => {
      if (
        !state.room?.id ||
        !state.currentParticipantId ||
        !state.sessionToken
      ) {
        return;
      }

      try {
        await roomClient.transferOwnership({
          roomId: state.room.id,
          participantId: state.currentParticipantId,
          sessionToken: state.sessionToken,
          newHostId,
        });
        // The hostChanged event will update the state
      } catch (err) {
        const error =
          err instanceof Error ? err.message : "Failed to transfer ownership";
        setState((prev) => ({ ...prev, error }));
      }
    },
    [state.room?.id, state.currentParticipantId, state.sessionToken],
  );

  return {
    ...state,
    createRoom,
    joinRoom,
    leaveRoom,
    startRound,
    kickParticipant,
    transferOwnership,
  };
}

export { RoomState };
