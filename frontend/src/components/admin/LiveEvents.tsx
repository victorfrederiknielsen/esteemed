import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type AppEvent,
  AppEventType,
  useAppEvents,
} from "@/hooks/useAppEvents";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  DoorClosed,
  DoorOpen,
  Eye,
  Pause,
  Play,
  Trash2,
  Vote,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

function getEventIcon(type: AppEventType) {
  switch (type) {
    case AppEventType.ROOM_CREATED:
      return DoorOpen;
    case AppEventType.ROOM_CLOSED:
      return DoorClosed;
    case AppEventType.VOTE_CAST:
      return Vote;
    case AppEventType.VOTE_REVEALED:
      return Eye;
    default:
      return Circle;
  }
}

function getEventColor(type: AppEventType) {
  switch (type) {
    case AppEventType.ROOM_CREATED:
      return "text-green-500";
    case AppEventType.ROOM_CLOSED:
      return "text-red-500";
    case AppEventType.VOTE_CAST:
      return "text-blue-500";
    case AppEventType.VOTE_REVEALED:
      return "text-amber-500";
    default:
      return "text-muted-foreground";
  }
}

function getEventTitle(type: AppEventType) {
  switch (type) {
    case AppEventType.ROOM_CREATED:
      return "Room Created";
    case AppEventType.ROOM_CLOSED:
      return "Room Closed";
    case AppEventType.VOTE_CAST:
      return "Vote Cast";
    case AppEventType.VOTE_REVEALED:
      return "Votes Revealed";
    default:
      return "Unknown Event";
  }
}

function formatTime(timestamp: bigint): string {
  const date = new Date(Number(timestamp));
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-muted px-1 py-0.5 text-foreground">
      {children}
    </span>
  );
}

function EventDetail({ event }: { event: AppEvent }) {
  switch (event.payload.case) {
    case "roomCreated":
      return (
        <span className="text-muted-foreground">
          by <Tag>{event.payload.value.hostName}</Tag>
        </span>
      );
    case "roomClosed":
      return (
        <span className="text-muted-foreground">
          {event.payload.value.reason}
        </span>
      );
    case "voteCast":
      return (
        <span className="text-muted-foreground">
          <Tag>{event.payload.value.participantName}</Tag> (
          {event.payload.value.votesInRound} in round)
        </span>
      );
    case "voteRevealed": {
      const { voteCount, consensus, average } = event.payload.value;
      return (
        <span className="text-muted-foreground">
          {voteCount} votes
          {consensus && (
            <span className="ml-2 inline-flex items-center gap-1 text-green-600">
              <CheckCircle2 className="size-3" />
              Consensus
            </span>
          )}
          {average && (
            <span className="ml-2">
              avg <Tag>{average}</Tag>
            </span>
          )}
        </span>
      );
    }
    default:
      return null;
  }
}

function EventRow({ event, isNew }: { event: AppEvent; isNew: boolean }) {
  const Icon = getEventIcon(event.type);
  const colorClass = getEventColor(event.type);

  return (
    <div
      className={cn(
        "flex items-start gap-3 border-b border-border/50 py-2 last:border-0",
        isNew && "animate-pop-in",
      )}
    >
      <div className={cn("mt-0.5 shrink-0", colorClass)}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-medium">{getEventTitle(event.type)}</span>
          <span className="rounded bg-primary/10 px-1 py-0.5 text-primary">
            {event.roomName}
          </span>
        </div>
        <div className="text-muted-foreground text-xs">
          <EventDetail event={event} />
        </div>
      </div>
      <div className="shrink-0 text-muted-foreground text-xs tabular-nums">
        {formatTime(event.timestamp)}
      </div>
    </div>
  );
}

export function LiveEvents() {
  const { events, isConnected, isPaused, error, clearEvents, togglePause } =
    useAppEvents();

  const [newestTimestamp, setNewestTimestamp] = useState<bigint | null>(null);
  const prevFirstTimestampRef = useRef<bigint | null>(null);

  // Track when a new event arrives
  useEffect(() => {
    const firstTimestamp = events[0]?.timestamp ?? null;
    if (firstTimestamp && firstTimestamp !== prevFirstTimestampRef.current) {
      setNewestTimestamp(firstTimestamp);
      prevFirstTimestampRef.current = firstTimestamp;
    }
  }, [events]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Event Stream
          <div className="relative flex size-2">
            <span
              className={cn(
                "absolute inline-flex h-full w-full rounded-full opacity-75",
                isConnected ? "animate-ping bg-red-500" : "bg-gray-400",
              )}
            />
            <span
              className={cn(
                "relative inline-flex size-2 rounded-full",
                isConnected ? "bg-red-500" : "bg-gray-400",
              )}
            />
          </div>
          {isPaused && (
            <span className="font-normal text-muted-foreground text-xs">
              (paused)
            </span>
          )}
        </CardTitle>
        <CardAction className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePause}
            className="size-8"
          >
            {isPaused ? (
              <Play className="size-4" />
            ) : (
              <Pause className="size-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={clearEvents}
            className="size-8"
            disabled={events.length === 0}
          >
            <Trash2 className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="h-[600px] overflow-y-auto font-mono text-sm scrollbar-none">
          {events.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <Circle className="size-8 animate-pulse" />
              <p>Waiting for events...</p>
              <p className="text-xs">
                Create a room, cast a vote, or reveal votes to see live events
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {events.map((event, index) => (
                <EventRow
                  key={`${event.timestamp}-${index}`}
                  event={event}
                  isNew={index === 0 && event.timestamp === newestTimestamp}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
