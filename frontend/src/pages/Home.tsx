import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRoom } from "@/hooks/useRoom";

export function HomePage() {
  const navigate = useNavigate();
  const { createRoom, joinRoom, isLoading, error } = useRoom();
  const [hostName, setHostName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [mode, setMode] = useState<"create" | "join">("create");

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
      await joinRoom(roomCode.trim(), participantName.trim());
      navigate(`/room/${roomCode.trim()}`);
    } catch (err) {
      console.error("Failed to join room:", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Esteemed</h1>
          <p className="mt-2 text-slate-600">Planning poker for engineering teams</p>
        </div>

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
                  <label htmlFor="hostName" className="block text-sm font-medium text-slate-700 mb-1">
                    Your Name
                  </label>
                  <Input
                    id="hostName"
                    placeholder="Enter your name"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading || !hostName.trim()}>
                  {isLoading ? "Creating..." : "Create Room"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label htmlFor="roomCode" className="block text-sm font-medium text-slate-700 mb-1">
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
                  <label htmlFor="participantName" className="block text-sm font-medium text-slate-700 mb-1">
                    Your Name
                  </label>
                  <Input
                    id="participantName"
                    placeholder="Enter your name"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !roomCode.trim() || !participantName.trim()}
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

        <p className="mt-6 text-center text-sm text-slate-500">
          Real-time estimation for agile teams
        </p>
      </div>
    </div>
  );
}
