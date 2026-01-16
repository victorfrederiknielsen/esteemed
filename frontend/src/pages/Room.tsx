import { ParticipantList } from "@/components/room/ParticipantList";
import { VotingCards } from "@/components/room/VotingCards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RoomState, useRoom } from "@/hooks/useRoom";
import { useVoting } from "@/hooks/useVoting";
import { generateParticipantName } from "@/lib/namegen";
import confetti from "canvas-confetti";
import {
  Clock,
  Copy,
  Dices,
  Eye,
  LogOut,
  Play,
  RefreshCw,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [joinName, setJoinName] = useState("");
  const [copied, setCopied] = useState(false);

  const {
    room,
    participants,
    currentParticipantId,
    sessionToken,
    isHost,
    isConnected,
    isLoading: roomLoading,
    error: roomError,
    joinRoom,
    leaveRoom,
    startRound,
  } = useRoom(roomId);

  const {
    voteStatuses,
    summary,
    currentVote,
    isRevealed,
    isLoading: voteLoading,
    castVote,
    revealVotes,
    resetRound,
  } = useVoting(room?.id ?? null, currentParticipantId, sessionToken, isHost);

  // Redirect if room closed
  useEffect(() => {
    if (roomError?.includes("closed")) {
      navigate("/");
    }
  }, [roomError, navigate]);

  // Confetti when votes are revealed
  const hasTriggeredConfetti = useRef(false);
  useEffect(() => {
    if (isRevealed && !hasTriggeredConfetti.current) {
      hasTriggeredConfetti.current = true;

      // Fire confetti from center
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x: 0.5, y: 0.4 },
        colors: [
          "#22c55e",
          "#10b981",
          "#06b6d4",
          "#8b5cf6",
          "#ec4899",
          "#f59e0b",
        ],
      });
    } else if (!isRevealed) {
      hasTriggeredConfetti.current = false;
    }
  }, [isRevealed]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId || !joinName.trim()) return;
    await joinRoom(roomId, joinName.trim());
  };

  const handleLeave = async () => {
    await leaveRoom();
    navigate("/");
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Show join form if not connected
  if (!isConnected && !roomLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Join Room: {roomId}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label
                  htmlFor="joinName"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Your Name
                </label>
                <div className="flex gap-2">
                  <Input
                    id="joinName"
                    placeholder="Enter your name"
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    disabled={roomLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setJoinName(generateParticipantName())}
                    disabled={roomLoading}
                    title="Generate random name"
                  >
                    <Dices className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={roomLoading || !joinName.trim()}
              >
                {roomLoading ? "Joining..." : "Join Room"}
              </Button>
            </form>
            {roomError && (
              <p className="mt-4 text-sm text-red-600 text-center">
                {roomError}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const isWaiting = room?.state === RoomState.WAITING;
  const isVoting = room?.state === RoomState.VOTING;
  const votedCount = voteStatuses.filter((v) => v.hasVoted).length;
  const totalParticipants = participants.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-900">Esteemed</h1>
            <Badge variant="secondary" className="font-mono">
              {room?.name}
            </Badge>
            <Button variant="ghost" size="sm" onClick={copyRoomLink}>
              <Copy className="h-4 w-4 mr-1" />
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Users className="h-4 w-4" />
              {totalParticipants} participant
              {totalParticipants !== 1 ? "s" : ""}
            </div>
            <Button variant="outline" size="sm" onClick={handleLeave}>
              <LogOut className="h-4 w-4 mr-1" />
              Leave
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Waiting state */}
            {isWaiting && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Ready to Estimate?</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4 py-4">
                    <div className="flex justify-center">
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                        <Clock className="h-8 w-8 text-slate-400 animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-600 font-medium">
                        {isHost
                          ? "Ready when you are"
                          : "Waiting for the host to start"}
                      </p>
                      <p className="text-sm text-slate-400">
                        {totalParticipants === 1
                          ? "You're the only one here so far"
                          : `${totalParticipants} participants in the room`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Voting cards - shown during voting and after reveal */}
            {(isVoting || isRevealed) && (
              <VotingCards
                selectedValue={currentVote}
                onSelect={castVote}
                disabled={false}
                isRevealed={isRevealed}
                summary={summary}
              />
            )}

            {/* Vote progress - shown during voting */}
            {isVoting && !isRevealed && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600">
                      Votes: {votedCount} / {totalParticipants}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(votedCount / Math.max(totalParticipants, 1)) * 100}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Host Controls */}
            {isHost && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isWaiting && (
                    <Button
                      size="lg"
                      onClick={startRound}
                      className="w-full gap-2"
                    >
                      <Play className="h-5 w-5" />
                      Start Round
                    </Button>
                  )}
                  {isVoting && (
                    <Button
                      onClick={revealVotes}
                      disabled={voteLoading || votedCount === 0}
                      className="w-full gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Reveal Votes
                    </Button>
                  )}
                  {isRevealed && (
                    <Button
                      onClick={resetRound}
                      variant="outline"
                      className="w-full gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      New Round
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Participants */}
            <ParticipantList
              participants={participants}
              voteStatuses={voteStatuses}
              currentParticipantId={currentParticipantId}
              isRevealed={isRevealed}
              summary={summary}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
