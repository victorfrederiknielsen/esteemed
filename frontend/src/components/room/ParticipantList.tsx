import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CardValue, Participant, VoteSummary } from "@/lib/types";
import { cardValueToLabel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check, Crown, Eye, Users } from "lucide-react";

interface VoteStatus {
  participantId: string;
  participantName: string;
  hasVoted: boolean;
}

interface ParticipantListProps {
  participants: Participant[];
  voteStatuses: VoteStatus[];
  currentParticipantId: string | null;
  isRevealed: boolean;
  summary: VoteSummary | null;
}

export function ParticipantList({
  participants,
  voteStatuses,
  currentParticipantId,
  isRevealed,
  summary,
}: ParticipantListProps) {
  // Split participants into voters and spectators
  const voters = participants.filter((p) => !p.isSpectator);
  const spectators = participants.filter((p) => p.isSpectator);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getVoteStatus = (participantId: string) => {
    return (
      voteStatuses.find((v) => v.participantId === participantId)?.hasVoted ??
      false
    );
  };

  const getVoteValue = (participantId: string): CardValue | null => {
    if (!isRevealed || !summary) return null;
    const vote = summary.votes.find((v) => v.participantId === participantId);
    return vote?.value ?? null;
  };

  const renderParticipant = (participant: Participant) => {
    const hasVoted = getVoteStatus(participant.id);
    const voteValue = getVoteValue(participant.id);
    const isCurrentUser = participant.id === currentParticipantId;

    return (
      <div
        key={participant.id}
        className={cn(
          "flex items-center gap-3 p-2 rounded-lg transition-colors",
          isCurrentUser && "bg-neutral-100/50 dark:bg-neutral-700/50",
        )}
      >
        <Avatar className="h-9 w-9">
          <AvatarFallback
            className={cn(
              "text-xs font-medium",
              !participant.isSpectator &&
                hasVoted &&
                !isRevealed &&
                "bg-success text-white",
            )}
          >
            {isRevealed && voteValue !== null ? (
              cardValueToLabel(voteValue)
            ) : hasVoted ? (
              <Check className="h-4 w-4" />
            ) : (
              getInitials(participant.name)
            )}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {participant.name}
            </span>
            {participant.isHost && (
              <Crown className="h-3.5 w-3.5 text-amber-500" />
            )}
            {isCurrentUser && (
              <Badge variant="outline" className="text-xs py-0">
                You
              </Badge>
            )}
          </div>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {!participant.isConnected
              ? "Disconnected"
              : participant.isSpectator
                ? "Watching"
                : isRevealed
                  ? voteValue !== null
                    ? `Voted ${cardValueToLabel(voteValue)}`
                    : "No vote"
                  : hasVoted
                    ? "Voted"
                    : "Waiting..."}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-white/70 dark:bg-neutral-800/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-4 w-4" />
          Participants ({participants.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Voters section */}
        {voters.length > 0 && (
          <div className="space-y-2">
            {voters.map(renderParticipant)}
          </div>
        )}

        {/* Spectators section */}
        {spectators.length > 0 && (
          <div className="space-y-2 pt-3 mt-3 border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
              <Eye className="h-3.5 w-3.5" />
              <span>Spectators ({spectators.length})</span>
            </div>
            <div className="space-y-1 bg-neutral-50/50 dark:bg-neutral-900/30 rounded-lg p-2 -mx-1">
              {spectators.map(renderParticipant)}
            </div>
          </div>
        )}

        {participants.length === 0 && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">
            No participants yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
