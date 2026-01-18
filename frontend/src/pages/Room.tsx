import { HostActionBar } from "@/components/room/HostActionBar";
import { LeaveConfirmDialog } from "@/components/room/LeaveConfirmDialog";
import { ParticipantList } from "@/components/room/ParticipantList";
import { QRCodeShare } from "@/components/room/QRCodeShare";
import { VotingCards } from "@/components/room/VotingCards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHeader } from "@/contexts/HeaderContext";
import { RoomState, useRoom } from "@/hooks/useRoom";
import { useVoting } from "@/hooks/useVoting";
import {
  getDisplayName,
  getRoomParticipantId,
  setCustomName,
} from "@/lib/client";
import { getDefaultCardConfig } from "@/lib/types";
import { Check, Clock, Copy } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useBlocker, useNavigate, useParams } from "react-router-dom";

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useHeader();
  const [joinName, setJoinName] = useState("");
  const [joinAsSpectator, setJoinAsSpectator] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  // Initialize name from global identity
  useEffect(() => {
    setJoinName(getDisplayName());
  }, []);

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
    // Persist the name on room join
    setCustomName(joinName.trim());
    await joinRoom(roomId, joinName.trim(), joinAsSpectator);
  };

  // Handler to update join name and persist to identity
  const handleJoinNameChange = useCallback((name: string) => {
    setJoinName(name);
    if (name.trim()) {
      setCustomName(name);
    }
  }, []);

  const copyRoomLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // Compute next host (earliest non-spectator joiner who isn't the current user)
  const nextHost = useMemo(() => {
    if (!isHost || participants.length <= 1) return null;

    const eligibleParticipants = participants
      .filter((p) => p.id !== currentParticipantId && !p.isSpectator)
      .sort((a, b) => {
        const aTime = a.joinedAt ? Number(a.joinedAt) : 0;
        const bTime = b.joinedAt ? Number(b.joinedAt) : 0;
        return aTime - bTime;
      });

    return eligibleParticipants.length > 0
      ? eligibleParticipants[0].name
      : null;
  }, [participants, currentParticipantId, isHost]);

  const isAlone = participants.length === 1;

  // Block navigation when connected - show leave confirmation
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isConnected && currentLocation.pathname !== nextLocation.pathname,
  );

  // Show dialog when navigation is blocked
  useEffect(() => {
    if (blocker.state === "blocked") {
      setShowLeaveDialog(true);
    }
  }, [blocker.state]);

  const handleLeaveConfirm = useCallback(async () => {
    setShowLeaveDialog(false);

    // Store whether we need to proceed before leaving (blocker state may change)
    const shouldProceed = blocker.state === "blocked";

    await leaveRoom();

    if (shouldProceed) {
      blocker.proceed();
    } else {
      // Manual leave click - navigate home
      navigate("/");
    }
  }, [leaveRoom, navigate, blocker]);

  const handleLeaveCancel = useCallback(() => {
    setShowLeaveDialog(false);
    if (blocker.state === "blocked") {
      blocker.reset();
    }
  }, [blocker]);

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
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted">
          <span className="font-mono text-sm">{roomName}</span>
          <button
            type="button"
            onClick={copyRoomLink}
            className="p-0.5 rounded hover:bg-accent transition-colors"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-neutral-500" />
            )}
            <span className="sr-only">{copied ? "Copied!" : "Copy link"}</span>
          </button>
        </span>
        <QRCodeShare url={window.location.href} />
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

    return () => {
      setBreadcrumbs([]);
    };
  }, [room?.name, roomId, copied, setBreadcrumbs, copyRoomLink]);

  // Check if we have a previous session (for auto-reconnect)
  const hasPreviousSession = roomId ? !!getRoomParticipantId(roomId) : false;

  // Show reconnecting state if we have a previous session and are loading
  if (!isConnected && hasPreviousSession) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Clock className="h-6 w-6 text-neutral-400 animate-pulse" />
                </div>
              </div>
              <p className="text-neutral-600 dark:text-neutral-300 font-medium">
                Reconnecting to {roomId}...
              </p>
              {roomError && <p className="text-sm text-red-600">{roomError}</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show join form if not connected and no previous session
  if (!isConnected && !roomLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle as="h2">Join Room: {roomId}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="joinName">Your Name</Label>
                <Input
                  id="joinName"
                  placeholder="Enter your name"
                  value={joinName}
                  onChange={(e) => handleJoinNameChange(e.target.value)}
                  disabled={roomLoading}
                  autoComplete="name"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="joinAsSpectatorRoom"
                  checked={joinAsSpectator}
                  onChange={(e) => setJoinAsSpectator(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <Label
                  htmlFor="joinAsSpectatorRoom"
                  className="text-muted-foreground cursor-pointer"
                >
                  Join as spectator (watch only)
                </Label>
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
  const isRoomRevealed = room?.state === RoomState.REVEALED;
  const votedCount = voteStatuses.filter((v) => v.hasVoted).length;
  // Exclude spectators from the total count (they don't vote)
  const totalVoters = participants.filter((p) => !p.isSpectator).length;

  return (
    <>
      <LeaveConfirmDialog
        open={showLeaveDialog}
        onOpenChange={setShowLeaveDialog}
        onConfirm={handleLeaveConfirm}
        onCancel={handleLeaveCancel}
        isHost={isHost}
        nextHost={nextHost}
        isAlone={isAlone}
      />
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
            <Card className="bg-card/70 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle as="h2" className="text-lg">
                  Ready to Estimate?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4 py-4">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
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
          {((isVoting && !isSpectator) || isRevealed || isRoomRevealed) && (
            <VotingCards
              cards={room?.cardConfig?.cards || getDefaultCardConfig().cards}
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
    </>
  );
}
