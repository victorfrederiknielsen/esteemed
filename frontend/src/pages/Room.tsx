import { ParticipantList } from "@/components/room/ParticipantList";
import { VotingCards } from "@/components/room/VotingCards";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { RoomState, useRoom } from "@/hooks/useRoom";
import { useVoting } from "@/hooks/useVoting";
import { generateParticipantName } from "@/lib/namegen";
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
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

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
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Join Room: {roomId}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label
                  htmlFor="joinName"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
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
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/" className="font-semibold">
                    Esteemed
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Rooms</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-mono flex items-center gap-2">
                  {room?.name}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={copyRoomLink}
                  >
                    <Copy className="h-3 w-3" />
                    <span className="sr-only">
                      {copied ? "Copied!" : "Copy link"}
                    </span>
                  </Button>
                  {copied && (
                    <span className="text-xs text-muted-foreground">
                      Copied!
                    </span>
                  )}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              <Users className="h-4 w-4" />
              {totalParticipants} participant
              {totalParticipants !== 1 ? "s" : ""}
            </div>
            <ThemeToggle />
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
              <Card className="bg-white/70 dark:bg-neutral-800/70 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Ready to Estimate?</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4 py-4">
                    <div className="flex justify-center">
                      <div className="w-16 h-16 rounded-full bg-neutral-100/50 dark:bg-neutral-700/50 flex items-center justify-center">
                        <Clock className="h-8 w-8 text-neutral-400 animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-neutral-600 dark:text-neutral-300 font-medium">
                        {isHost
                          ? "Ready when you are"
                          : "Waiting for the host to start"}
                      </p>
                      <p className="text-sm text-neutral-400">
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
              <Card className="bg-white/70 dark:bg-neutral-800/70 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Votes: {votedCount} / {totalParticipants}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200/50 dark:bg-neutral-700/50 rounded-full h-2">
                    <div
                      className="bg-primary/80 h-2 rounded-full transition-all duration-300"
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
              <Card className="bg-white/70 dark:bg-neutral-800/70 backdrop-blur-sm">
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
