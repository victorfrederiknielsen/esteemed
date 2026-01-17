import type { Participant, Room } from "@/gen/esteemed/v1/room_pb";
import { RoomState } from "@/gen/esteemed/v1/room_pb";
import {
  clearSession,
  estimationClient,
  loadSession,
  roomClient,
  saveSession,
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
  createRoom: (hostName: string) => Promise<string>;
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

  // Try to reconnect with existing session
  useEffect(() => {
    if (!roomId) return;

    const session = loadSession();
    if (session && session.roomId === roomId && joinRoomInternalRef.current) {
      // Try to rejoin with existing token
      joinRoomInternalRef.current(roomId, "", session.sessionToken);
    }
  }, [roomId]);

  // Start watching room events when connected
  useEffect(() => {
    if (!state.room?.id || !state.sessionToken) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const watchRoom = async () => {
      try {
        const stream = roomClient.watchRoom(
          { roomId: state.room!.id, sessionToken: state.sessionToken! },
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
            // Check if current user was kicked
            setState((prev) => {
              if (participantId === prev.currentParticipantId) {
                // Current user was kicked
                clearSession();
                return {
                  ...prev,
                  room: null,
                  isConnected: false,
                  error: "You have been removed from the room",
                };
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
            clearSession();
            setState((prev) => ({
              ...prev,
              room: null,
              isConnected: false,
              error: `Room closed: ${reason}`,
            }));
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
  }, [state.room?.id, state.sessionToken]);

  const createRoom = useCallback(async (hostName: string): Promise<string> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await roomClient.createRoom({ hostName });

      if (response.room) {
        saveSession({
          roomId: response.room.name, // Use name for URL matching
          participantId: response.participantId,
          sessionToken: response.sessionToken,
        });

        setState({
          room: response.room,
          participants: response.room.participants,
          currentParticipantId: response.participantId,
          sessionToken: response.sessionToken,
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
  }, []);

  const joinRoomInternal = async (
    roomIdOrName: string,
    participantName: string,
    existingToken?: string,
    isSpectator = false,
  ): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await roomClient.joinRoom({
        roomId: roomIdOrName,
        participantName,
        sessionToken: existingToken,
        isSpectator,
      });

      if (response.room) {
        saveSession({
          roomId: response.room.name, // Use name for URL matching
          participantId: response.participantId,
          sessionToken: response.sessionToken,
        });

        const currentParticipant = response.room.participants.find(
          (p) => p.id === response.participantId,
        );

        setState({
          room: response.room,
          participants: response.room.participants,
          currentParticipantId: response.participantId,
          sessionToken: response.sessionToken,
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
      return joinRoomInternal(
        roomIdOrName,
        participantName,
        undefined,
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
      await roomClient.leaveRoom({
        roomId: state.room.id,
        participantId: state.currentParticipantId,
        sessionToken: state.sessionToken,
      });

      clearSession();
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
