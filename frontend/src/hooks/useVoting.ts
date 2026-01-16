import type { VoteSummary } from "@/gen/esteemed/v1/estimation_pb";
import { CardValue } from "@/gen/esteemed/v1/estimation_pb";
import { estimationClient } from "@/lib/client";
import { useCallback, useEffect, useRef, useState } from "react";

interface VoteStatus {
  participantId: string;
  participantName: string;
  hasVoted: boolean;
}

interface UseVotingState {
  voteStatuses: VoteStatus[];
  summary: VoteSummary | null;
  currentVote: CardValue | null;
  isRevealed: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UseVotingActions {
  castVote: (value: CardValue) => Promise<void>;
  revealVotes: () => Promise<void>;
  resetRound: () => Promise<void>;
}

export function useVoting(
  roomId: string | null,
  participantId: string | null,
  sessionToken: string | null,
  isHost: boolean,
): UseVotingState & UseVotingActions {
  const [state, setState] = useState<UseVotingState>({
    voteStatuses: [],
    summary: null,
    currentVote: null,
    isRevealed: false,
    isLoading: false,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Watch vote events
  useEffect(() => {
    if (!roomId || !sessionToken) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const watchVotes = async () => {
      try {
        const stream = estimationClient.watchVotes(
          { roomId, sessionToken },
          { signal: controller.signal },
        );

        for await (const event of stream) {
          if (event.event?.case === "voteCast") {
            const { participantId: voterId, participantName } =
              event.event.value;
            setState((prev) => {
              const existing = prev.voteStatuses.find(
                (v) => v.participantId === voterId,
              );
              if (existing) {
                return {
                  ...prev,
                  voteStatuses: prev.voteStatuses.map((v) =>
                    v.participantId === voterId ? { ...v, hasVoted: true } : v,
                  ),
                };
              }
              return {
                ...prev,
                voteStatuses: [
                  ...prev.voteStatuses,
                  {
                    participantId: voterId,
                    participantName,
                    hasVoted: true,
                  },
                ],
              };
            });
          } else if (event.event?.case === "votesRevealed") {
            const summary = event.event.value.summary ?? null;
            setState((prev) => ({
              ...prev,
              summary,
              isRevealed: true,
            }));
          } else if (event.event?.case === "roundReset") {
            setState((prev) => ({
              ...prev,
              voteStatuses: prev.voteStatuses.map((v) => ({
                ...v,
                hasVoted: false,
              })),
              summary: null,
              currentVote: null,
              isRevealed: false,
            }));
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Watch votes error:", err);
          // Retry connection after a delay
          retryTimeout = setTimeout(() => {
            if (!controller.signal.aborted) {
              watchVotes();
            }
          }, 2000);
        }
      }
    };

    watchVotes();

    return () => {
      controller.abort();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [roomId, sessionToken]);

  const castVote = useCallback(
    async (value: CardValue): Promise<void> => {
      if (!roomId || !participantId || !sessionToken) return;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        await estimationClient.castVote({
          roomId,
          participantId,
          sessionToken,
          value,
        });

        setState((prev) => ({
          ...prev,
          currentVote: value,
          isLoading: false,
        }));
      } catch (err) {
        const error =
          err instanceof Error ? err.message : "Failed to cast vote";
        setState((prev) => ({ ...prev, isLoading: false, error }));
      }
    },
    [roomId, participantId, sessionToken],
  );

  const revealVotes = useCallback(async (): Promise<void> => {
    if (!roomId || !participantId || !sessionToken || !isHost) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await estimationClient.revealVotes({
        roomId,
        participantId,
        sessionToken,
      });

      setState((prev) => ({
        ...prev,
        summary: response.summary ?? null,
        isRevealed: true,
        isLoading: false,
      }));
    } catch (err) {
      const error =
        err instanceof Error ? err.message : "Failed to reveal votes";
      setState((prev) => ({ ...prev, isLoading: false, error }));
    }
  }, [roomId, participantId, sessionToken, isHost]);

  const resetRound = useCallback(async (): Promise<void> => {
    if (!roomId || !participantId || !sessionToken || !isHost) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await estimationClient.resetRound({
        roomId,
        participantId,
        sessionToken,
      });

      setState((prev) => ({
        ...prev,
        voteStatuses: prev.voteStatuses.map((v) => ({ ...v, hasVoted: false })),
        summary: null,
        currentVote: null,
        isRevealed: false,
        isLoading: false,
      }));
    } catch (err) {
      const error =
        err instanceof Error ? err.message : "Failed to reset round";
      setState((prev) => ({ ...prev, isLoading: false, error }));
    }
  }, [roomId, participantId, sessionToken, isHost]);

  return {
    ...state,
    castVote,
    revealVotes,
    resetRound,
  };
}

export { CardValue };
