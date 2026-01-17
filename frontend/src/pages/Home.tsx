import { CardPresetSelector } from "@/components/room/CardPresetSelector";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHeader } from "@/contexts/HeaderContext";
import type { CardConfig } from "@/gen/esteemed/v1/room_pb";
import { useRoom } from "@/hooks/useRoom";
import {
  type RecentRoom,
  formatRelativeTime,
  getDisplayName,
  getRecentRooms,
  setCustomName,
} from "@/lib/client";
import { getDefaultCardConfig } from "@/lib/types";
import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
  const [cardConfig, setCardConfig] =
    useState<CardConfig>(getDefaultCardConfig);
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);

  // Initialize name from global identity and load recent rooms
  useEffect(() => {
    const displayName = getDisplayName();
    setHostName(displayName);
    setParticipantName(displayName);
    setRecentRooms(getRecentRooms());
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

  // Set header breadcrumbs
  useEffect(() => {
    setBreadcrumbs([{ label: "Esteemed" }]);
  }, [setBreadcrumbs]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) return;

    try {
      // Persist the name on room creation
      setCustomName(hostName.trim());
      const roomName = await createRoom(hostName.trim(), cardConfig);
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

  // Handler for clicking a recent room chip
  const handleRecentRoomClick = useCallback((roomName: string) => {
    setRoomCode(roomName);
    setMode("join");
  }, []);

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-normal tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center justify-center gap-2 font-display">
          <Sparkles className="h-8 w-8" />
          Esteemed
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Planning poker for engineering teams
        </p>
      </div>

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
              <div className="space-y-2">
                <Label htmlFor="hostName">Your Name</Label>
                <Input
                  id="hostName"
                  placeholder="Enter your name"
                  value={hostName}
                  onChange={(e) => handleHostNameChange(e.target.value)}
                  disabled={isLoading}
                  autoComplete="name"
                />
              </div>
              <CardPresetSelector
                value={cardConfig}
                onChange={setCardConfig}
                disabled={isLoading}
              />
              <Button
                type="submit"
                className="w-full mt-4"
                disabled={isLoading || !hostName.trim()}
              >
                {isLoading ? "Creating..." : "Create Room"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roomCode">Room Code</Label>
                <Input
                  id="roomCode"
                  placeholder="e.g., brave-falcon-42"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="participantName">Your Name</Label>
                <Input
                  id="participantName"
                  placeholder="Enter your name"
                  value={participantName}
                  onChange={(e) => handleParticipantNameChange(e.target.value)}
                  disabled={isLoading}
                  autoComplete="name"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="joinAsSpectator"
                  checked={joinAsSpectator}
                  onChange={(e) => setJoinAsSpectator(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <Label
                  htmlFor="joinAsSpectator"
                  className="text-muted-foreground cursor-pointer"
                >
                  Join as spectator (watch only)
                </Label>
              </div>
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

      {/* Recent Rooms */}
      {recentRooms.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
            Recent rooms:
          </p>
          <div className="flex flex-wrap gap-2">
            {recentRooms.map((room) => (
              <button
                type="button"
                key={room.name}
                onClick={() => handleRecentRoomClick(room.name)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-mono bg-muted/50 hover:bg-muted rounded-full transition-colors cursor-pointer"
              >
                <span>{room.name}</span>
                <span className="text-neutral-400 dark:text-neutral-500">
                  •
                </span>
                <span className="text-neutral-500 dark:text-neutral-400 text-xs">
                  {formatRelativeTime(room.lastVisited)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
