import { EventService } from "@/gen/esteemed/v1/events_connect";
import type { AppEvent } from "@/gen/esteemed/v1/events_pb";
import { AppEventType } from "@/gen/esteemed/v1/events_pb";
import { createPromiseClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { useCallback, useEffect, useRef, useState } from "react";

const transport = createConnectTransport({
  baseUrl: window.location.origin,
  useBinaryFormat: false,
});

const eventClient = createPromiseClient(EventService, transport);

const MAX_EVENTS = 100;

interface UseAppEventsState {
  events: AppEvent[];
  isConnected: boolean;
  isPaused: boolean;
  error: string | null;
}

interface UseAppEventsActions {
  clearEvents: () => void;
  togglePause: () => void;
}

export function useAppEvents(): UseAppEventsState & UseAppEventsActions {
  const [state, setState] = useState<UseAppEventsState>({
    events: [],
    isConnected: false,
    isPaused: false,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelayRef = useRef(1000);
  const isPausedRef = useRef(false);

  // Keep ref in sync with state for use in async code
  useEffect(() => {
    isPausedRef.current = state.isPaused;
  }, [state.isPaused]);

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const watchEvents = async () => {
      try {
        setState((prev) => ({ ...prev, isConnected: true, error: null }));
        retryDelayRef.current = 1000; // Reset retry delay on successful connection

        const stream = eventClient.watchEvents(
          { types: [] }, // Empty = all event types
          { signal: controller.signal },
        );

        for await (const event of stream) {
          // Skip adding events if paused
          if (isPausedRef.current) {
            continue;
          }

          setState((prev) => ({
            ...prev,
            events: [event, ...prev.events].slice(0, MAX_EVENTS),
          }));
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          const error = err instanceof Error ? err.message : "Connection lost";
          console.error("Watch events error:", error);

          setState((prev) => ({
            ...prev,
            isConnected: false,
            error,
          }));

          // Exponential backoff retry
          retryTimeoutRef.current = setTimeout(() => {
            if (!controller.signal.aborted) {
              retryDelayRef.current = Math.min(
                retryDelayRef.current * 2,
                30000,
              );
              watchEvents();
            }
          }, retryDelayRef.current);
        }
      }
    };

    watchEvents();

    return () => {
      controller.abort();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const clearEvents = useCallback(() => {
    setState((prev) => ({ ...prev, events: [] }));
  }, []);

  const togglePause = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: !prev.isPaused }));
  }, []);

  return {
    ...state,
    clearEvents,
    togglePause,
  };
}

export { AppEventType };
export type { AppEvent };
