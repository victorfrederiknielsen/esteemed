import { HostActionBar } from "@/components/room/HostActionBar";
import { ParticipantList } from "@/components/room/ParticipantList";
import { VotingCards } from "@/components/room/VotingCards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useHeader } from "@/contexts/HeaderContext";
import { RoomState, useRoom } from "@/hooks/useRoom";
import { useVoting } from "@/hooks/useVoting";
import { generateParticipantName } from "@/lib/namegen";
import { Check, Clock, Copy, Dices, LogOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs, setActions } = useHeader();
  const [joinName, setJoinName] = useState("");
  const [joinAsSpectator, setJoinAsSpectator] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    room,
    participants,
    currentParticipantId,
    sessionToken,
    isHost,
    isSpectator,
    isConnected,
    isLoading: roomLoading,
    error: roomError,
    joinRoom,
    leaveRoom,
    startRound,
    kickParticipant,
    transferOwnership,
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

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId || !joinName.trim()) return;
    await joinRoom(roomId, joinName.trim(), joinAsSpectator);
  };

  const handleLeave = useCallback(async () => {
    await leaveRoom();
    navigate("/");
  }, [leaveRoom, navigate]);

  const copyRoomLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // Redirect if room closed
  useEffect(() => {
    if (roomError?.includes("closed")) {
      navigate("/");
    }
  }, [roomError, navigate]);

  // Set header breadcrumbs and actions
  useEffect(() => {
    const roomName = room?.name || roomId || "";

    const roomChip = (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800">
        <span className="font-mono text-sm">{roomName}</span>
        <button
          type="button"
          onClick={copyRoomLink}
          className="p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-neutral-500" />
          )}
          <span className="sr-only">{copied ? "Copied!" : "Copy link"}</span>
        </button>
      </span>
    );

    setBreadcrumbs([
      { label: "Esteemed", href: "/" },
      { label: "Rooms", href: "/" },
      {
        label: roomName,
        element: roomChip,
      },
    ]);

    setActions(
      <Button variant="outline" size="sm" onClick={handleLeave}>
        <LogOut className="h-4 w-4 mr-1" />
        Leave
      </Button>,
    );

    return () => {
      setBreadcrumbs([]);
      setActions(null);
    };
  }, [
    room?.name,
    roomId,
    copied,
    setBreadcrumbs,
    setActions,
    copyRoomLink,
    handleLeave,
  ]);

  // Show join form if not connected
  if (!isConnected && !roomLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
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
                    autoComplete="name"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setJoinName(generateParticipantName())}
                    disabled={roomLoading}
                    aria-label="Generate random name"
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
  // Exclude spectators from the total count (they don't vote)
  const totalVoters = participants.filter((p) => !p.isSpectator).length;

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Main content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Host Action Bar */}
        {isHost && (
          <HostActionBar
            roomState={room?.state}
            isRevealed={isRevealed}
            votedCount={votedCount}
            totalVoters={totalVoters}
            isLoading={voteLoading}
            onStartRound={startRound}
            onRevealVotes={revealVotes}
            onResetRound={resetRound}
          />
        )}

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
                    {participants.length === 1
                      ? "You're the only one here so far"
                      : `${participants.length} participants in the room`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Voting cards - shown during voting (not for spectators) and after reveal (for everyone) */}
        {((isVoting && !isSpectator) || isRevealed) && (
          <VotingCards
            selectedValue={currentVote}
            onSelect={castVote}
            disabled={isSpectator}
            isRevealed={isRevealed}
            summary={summary}
          />
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Participants */}
        <ParticipantList
          participants={participants}
          voteStatuses={voteStatuses}
          currentParticipantId={currentParticipantId}
          isRevealed={isRevealed}
          summary={summary}
          isHost={isHost}
          onKickParticipant={kickParticipant}
          onTransferOwnership={transferOwnership}
        />
      </div>
    </div>
  );
}
