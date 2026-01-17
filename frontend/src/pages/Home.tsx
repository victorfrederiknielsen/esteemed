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
import { roomClient } from "@/lib/client";
import { generateParticipantName } from "@/lib/namegen";
import { Dices, RefreshCw, Users } from "lucide-react";
import { useEffect, useState } from "react";
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
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  // Set header breadcrumbs
  useEffect(() => {
    setBreadcrumbs([{ label: "Esteemed" }]);
  }, [setBreadcrumbs]);

  const fetchRooms = async () => {
    try {
      setLoadingRooms(true);
      const response = await roomClient.listRooms({});
      setRooms(response.rooms);
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    // Poll for room updates every 5 seconds
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) return;

    try {
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
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
            <CardTitle>
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
                  <div className="flex gap-2">
                    <Input
                      id="hostName"
                      placeholder="Enter your name"
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value)}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setHostName(generateParticipantName())}
                      disabled={isLoading}
                      title="Generate random name"
                    >
                      <Dices className="h-4 w-4" />
                    </Button>
                  </div>
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
                  <div className="flex gap-2">
                    <Input
                      id="participantName"
                      placeholder="Enter your name"
                      value={participantName}
                      onChange={(e) => setParticipantName(e.target.value)}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setParticipantName(generateParticipantName())
                      }
                      disabled={isLoading}
                      title="Generate random name"
                    >
                      <Dices className="h-4 w-4" />
                    </Button>
                  </div>
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
              <CardTitle>Active Rooms</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchRooms}
                disabled={loadingRooms}
              >
                <RefreshCw
                  className={`h-4 w-4 ${loadingRooms ? "animate-spin" : ""}`}
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
                {[...rooms]
                  .sort((a, b) => {
                    // Sort by participant count descending, then alphabetically
                    if (b.participantCount !== a.participantCount) {
                      return b.participantCount - a.participantCount;
                    }
                    return a.name.localeCompare(b.name);
                  })
                  .map((room) => (
                    <div
                      key={room.id}
                      className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      onClick={() => {
                        setRoomCode(room.name);
                        setMode("join");
                      }}
                    >
                      <p className="font-mono font-medium text-sm">
                        {room.name}
                      </p>
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
                    </div>
                  ))}
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
