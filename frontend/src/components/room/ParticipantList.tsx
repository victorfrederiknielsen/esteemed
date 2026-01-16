import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Participant, VoteSummary, CardValue } from "@/gen/types";
import { cardValueToLabel } from "@/gen/types";
import { Check, Crown } from "lucide-react";

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
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getVoteStatus = (participantId: string) => {
    return voteStatuses.find((v) => v.participantId === participantId)?.hasVoted ?? false;
  };

  const getVoteValue = (participantId: string): CardValue | null => {
    if (!isRevealed || !summary) return null;
    const vote = summary.votes.find((v) => v.participantId === participantId);
    return vote?.value ?? null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Participants</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {participants.map((participant) => {
          const hasVoted = getVoteStatus(participant.id);
          const voteValue = getVoteValue(participant.id);
          const isCurrentUser = participant.id === currentParticipantId;

          return (
            <div
              key={participant.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg transition-colors",
                isCurrentUser && "bg-slate-50"
              )}
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback
                  className={cn(
                    "text-xs font-medium",
                    hasVoted && !isRevealed && "bg-success text-white"
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
                <span className="text-xs text-slate-500">
                  {!participant.isConnected
                    ? "Disconnected"
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
        })}

        {participants.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">
            No participants yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
