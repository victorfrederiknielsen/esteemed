import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useHeader } from "@/contexts/HeaderContext";
import type { RoomSummary } from "@/gen/esteemed/v1/room_pb";
import { RoomState } from "@/gen/esteemed/v1/room_pb";
import { useRoom } from "@/hooks/useRoom";
import { getDisplayName, roomClient, setCustomName } from "@/lib/client";
import { Clock, RefreshCw, Sparkles, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export function HomePage() {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useHeader();
  const { createRoom, joinRoom, isLoading, error } = useRoom();
  const [hostName, setHostName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [joinAsSpectator, setJoinAsSpectator] = useState(false);
  const [mode, setMode] = useState<"create" | "join">("create");

  // Initialize name from global identity
  useEffect(() => {
    const displayName = getDisplayName();
    setHostName(displayName);
    setParticipantName(displayName);
  }, []);

  // Handler to update host name and persist to identity
  const handleHostNameChange = useCallback((name: string) => {
    setHostName(name);
    if (name.trim()) {
      setCustomName(name);
    }
  }, []);

  // Handler to update participant name and persist to identity
  const handleParticipantNameChange = useCallback((name: string) => {
    setParticipantName(name);
    if (name.trim()) {
      setCustomName(name);
    }
  }, []);

  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  // Update current time every second for countdown display
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Set header breadcrumbs
  useEffect(() => {
    setBreadcrumbs([{ label: "Esteemed" }]);
  }, [setBreadcrumbs]);

  const fetchRooms = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoadingRooms(true);
      const response = await roomClient.listRooms({}, { signal });
      if (!signal?.aborted) {
        setRooms(response.rooms);
      }
    } catch (err) {
      if (!signal?.aborted) {
        console.error("Failed to fetch rooms:", err);
      }
    } finally {
      if (!signal?.aborted) {
        setLoadingRooms(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchRooms(controller.signal);
    // Poll for room updates every 5 seconds
    const interval = setInterval(() => fetchRooms(controller.signal), 5000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [fetchRooms]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) return;

    try {
      // Persist the name on room creation
      setCustomName(hostName.trim());
      const roomName = await createRoom(hostName.trim());
      navigate(`/room/${roomName}`);
    } catch (err) {
      console.error("Failed to create room:", err);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim() || !participantName.trim()) return;

    try {
      // Persist the name on room join
      setCustomName(participantName.trim());
      await joinRoom(roomCode.trim(), participantName.trim(), joinAsSpectator);
      navigate(`/room/${roomCode.trim()}`);
    } catch (err) {
      console.error("Failed to join room:", err);
    }
  };

  const getRoomStateLabel = (state: RoomState) => {
    switch (state) {
      case RoomState.WAITING:
        return "Waiting";
      case RoomState.VOTING:
        return "Voting";
      case RoomState.REVEALED:
        return "Revealed";
      default:
        return "Unknown";
    }
  };

  const getRoomStateVariant = (state: RoomState) => {
    switch (state) {
      case RoomState.WAITING:
        return "secondary" as const;
      case RoomState.VOTING:
        return "default" as const;
      case RoomState.REVEALED:
        return "outline" as const;
      default:
        return "secondary" as const;
    }
  };

  const formatCountdown = (seconds: number): string => {
    if (seconds <= 0) return "Expiring...";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const sortedRooms = useMemo(
    () =>
      [...rooms].sort((a, b) => {
        // Sort by participant count descending, then alphabetically
        if (b.participantCount !== a.participantCount) {
          return b.participantCount - a.participantCount;
        }
        return a.name.localeCompare(b.name);
      }),
    [rooms],
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-medium tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center justify-center gap-2 font-display">
          <Sparkles className="h-8 w-8" />
          Esteemed
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Planning poker for engineering teams
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Create/Join Card */}
        <Card>
          <CardHeader>
            <div className="flex gap-2 mb-4">
              <Button
                variant={mode === "create" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setMode("create")}
              >
                Create Room
              </Button>
              <Button
                variant={mode === "join" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setMode("join")}
              >
                Join Room
              </Button>
            </div>
            <CardTitle as="h2">
              {mode === "create" ? "Create a New Room" : "Join Existing Room"}
            </CardTitle>
            <CardDescription>
              {mode === "create"
                ? "Start a new planning poker session"
                : "Enter the room code to join"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === "create" ? (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label
                    htmlFor="hostName"
                    className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                  >
                    Your Name
                  </label>
                  <Input
                    id="hostName"
                    placeholder="Enter your name"
                    value={hostName}
                    onChange={(e) => handleHostNameChange(e.target.value)}
                    disabled={isLoading}
                    autoComplete="name"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !hostName.trim()}
                >
                  {isLoading ? "Creating..." : "Create Room"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label
                    htmlFor="roomCode"
                    className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                  >
                    Room Code
                  </label>
                  <Input
                    id="roomCode"
                    placeholder="e.g., brave-falcon-42"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label
                    htmlFor="participantName"
                    className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                  >
                    Your Name
                  </label>
                  <Input
                    id="participantName"
                    placeholder="Enter your name"
                    value={participantName}
                    onChange={(e) =>
                      handleParticipantNameChange(e.target.value)
                    }
                    disabled={isLoading}
                    autoComplete="name"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={joinAsSpectator}
                    onChange={(e) => setJoinAsSpectator(e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    Join as spectator (watch only)
                  </span>
                </label>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    isLoading || !roomCode.trim() || !participantName.trim()
                  }
                >
                  {isLoading ? "Joining..." : "Join Room"}
                </Button>
              </form>
            )}

            {error && (
              <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* Active Rooms Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle as="h2">Active Rooms</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchRooms()}
                disabled={loadingRooms}
                aria-label="Refresh room list"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loadingRooms ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
              </Button>
            </div>
            <CardDescription>Join an existing session</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRooms && rooms.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">
                Loading rooms...
              </p>
            ) : rooms.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">
                No active rooms
              </p>
            ) : (
              <div className="space-y-3">
                {sortedRooms.map((room) => {
                  const secondsRemaining = Number(room.expiresAt) - now;
                  const isExpiringSoon = secondsRemaining < 120;

                  return (
                    <button
                      type="button"
                      key={room.id}
                      className="flex items-center justify-between p-3 w-full text-left bg-neutral-50 dark:bg-neutral-800/50 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      onClick={() => {
                        setRoomCode(room.name);
                        setMode("join");
                      }}
                    >
                      <div>
                        <p className="font-mono font-medium text-sm">
                          {room.name}
                        </p>
                        <p
                          className={`text-xs ${isExpiringSoon ? "text-amber-600 dark:text-amber-500" : "text-neutral-500 dark:text-neutral-400"}`}
                        >
                          {isExpiringSoon && (
                            <Clock className="inline h-3 w-3 mr-1" />
                          )}
                          Expires in {formatCountdown(secondsRemaining)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
                          <Users className="h-3.5 w-3.5" />
                          <span className="text-xs">
                            {room.participantCount}
                          </span>
                        </div>
                        <Badge variant={getRoomStateVariant(room.state)}>
                          {getRoomStateLabel(room.state)}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="mt-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Real-time estimation for agile teams
      </p>
    </div>
  );
}
