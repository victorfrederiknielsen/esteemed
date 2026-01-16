import { useState, useEffect, useCallback, useRef } from "react";
import { roomClient, estimationClient, saveSession, loadSession, clearSession } from "@/lib/client";
import type { Room, Participant } from "@/gen/esteemed/v1/room_pb";
import { RoomState } from "@/gen/esteemed/v1/room_pb";

interface UseRoomState {
  room: Room | null;
  participants: Participant[];
  currentParticipantId: string | null;
  sessionToken: string | null;
  isHost: boolean;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UseRoomActions {
  createRoom: (hostName: string) => Promise<string>;
  joinRoom: (roomId: string, participantName: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  setTopic: (topic: string) => Promise<void>;
}

export function useRoom(roomId?: string): UseRoomState & UseRoomActions {
  const [state, setState] = useState<UseRoomState>({
    room: null,
    participants: [],
    currentParticipantId: null,
    sessionToken: null,
    isHost: false,
    isConnected: false,
    isLoading: false,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Try to reconnect with existing session
  useEffect(() => {
    if (!roomId) return;

    const session = loadSession();
    if (session && session.roomId === roomId) {
      // Try to rejoin with existing token
      joinRoomInternal(roomId, "", session.sessionToken);
    }
  }, [roomId]);

  // Start watching room events when connected
  useEffect(() => {
    if (!state.room?.id || !state.sessionToken) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const watchRoom = async () => {
      try {
        const stream = roomClient.watchRoom(
          { roomId: state.room!.id, sessionToken: state.sessionToken! },
          { signal: controller.signal }
        );

        for await (const event of stream) {
          if (event.event?.case === "participantJoined" && event.event.value.participant) {
            const participant = event.event.value.participant;
            setState((prev) => ({
              ...prev,
              participants: [...prev.participants.filter(
                (p) => p.id !== participant.id
              ), participant],
            }));
          } else if (event.event?.case === "participantLeft") {
            const participantId = event.event.value.participantId;
            setState((prev) => ({
              ...prev,
              participants: prev.participants.filter(
                (p) => p.id !== participantId
              ),
            }));
          } else if (event.event?.case === "stateChanged") {
            const newState = event.event.value.newState;
            setState((prev) => {
              if (!prev.room) return prev;
              prev.room.state = newState;
              return { ...prev };
            });
          } else if (event.event?.case === "topicChanged") {
            const topic = event.event.value.topic;
            setState((prev) => {
              if (!prev.room) return prev;
              prev.room.currentTopic = topic;
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
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Watch room error:", err);
          setState((prev) => ({ ...prev, isConnected: false }));
        }
      }
    };

    watchRoom();

    return () => {
      controller.abort();
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
          isConnected: true,
          isLoading: false,
          error: null,
        });

        return response.room.name;
      }

      throw new Error("Failed to create room");
    } catch (err) {
      const error = err instanceof Error ? err.message : "Failed to create room";
      setState((prev) => ({ ...prev, isLoading: false, error }));
      throw err;
    }
  }, []);

  const joinRoomInternal = async (
    roomIdOrName: string,
    participantName: string,
    existingToken?: string
  ): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await roomClient.joinRoom({
        roomId: roomIdOrName,
        participantName,
        sessionToken: existingToken,
      });

      if (response.room) {
        saveSession({
          roomId: response.room.name, // Use name for URL matching
          participantId: response.participantId,
          sessionToken: response.sessionToken,
        });

        const currentParticipant = response.room.participants.find(
          (p) => p.id === response.participantId
        );

        setState({
          room: response.room,
          participants: response.room.participants,
          currentParticipantId: response.participantId,
          sessionToken: response.sessionToken,
          isHost: currentParticipant?.isHost ?? false,
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

  const joinRoom = useCallback(async (
    roomIdOrName: string,
    participantName: string
  ): Promise<void> => {
    return joinRoomInternal(roomIdOrName, participantName);
  }, []);

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
        isConnected: false,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error("Leave room error:", err);
    }
  }, [state.room?.id, state.currentParticipantId, state.sessionToken]);

  const setTopic = useCallback(async (topic: string): Promise<void> => {
    if (!state.room?.id || !state.currentParticipantId || !state.sessionToken) {
      return;
    }

    try {
      await estimationClient.setTopic({
        roomId: state.room.id,
        participantId: state.currentParticipantId,
        sessionToken: state.sessionToken,
        topic,
      });
      // Optimistically update local state since streaming might not work
      setState((prev) => {
        if (!prev.room) return prev;
        prev.room.currentTopic = topic;
        prev.room.state = RoomState.VOTING;
        return { ...prev };
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : "Failed to set topic";
      setState((prev) => ({ ...prev, error }));
    }
  }, [state.room?.id, state.currentParticipantId, state.sessionToken]);

  return {
    ...state,
    createRoom,
    joinRoom,
    leaveRoom,
    setTopic,
  };
}

export { RoomState };
