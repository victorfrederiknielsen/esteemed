import { Button } from "@/components/ui/button";
import { RoomState } from "@/hooks/useRoom";
import { cn } from "@/lib/utils";
import { Eye, Play, RefreshCw } from "lucide-react";

interface HostActionBarProps {
  roomState: RoomState | undefined;
  isRevealed: boolean;
  votedCount: number;
  totalVoters: number;
  isLoading: boolean;
  onStartRound: () => void;
  onRevealVotes: () => void;
  onResetRound: () => void;
}

function VoteDots({
  votedCount,
  totalVoters,
}: { votedCount: number; totalVoters: number }) {
  if (totalVoters === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: totalVoters }).map((_, i) => {
        const dotKey = `dot-${totalVoters}-${i}`;
        return (
          <div
            key={dotKey}
            className={cn(
              "w-2 h-2 rounded-full transition-colors duration-300",
              i < votedCount ? "bg-emerald-500" : "bg-muted",
            )}
          />
        );
      })}
    </div>
  );
}

export function HostActionBar({
  roomState,
  isRevealed,
  votedCount,
  totalVoters,
  isLoading,
  onStartRound,
  onRevealVotes,
  onResetRound,
}: HostActionBarProps) {
  const isWaiting = roomState === RoomState.WAITING;
  const isVoting = roomState === RoomState.VOTING && !isRevealed;

  return (
    <div className="relative z-10 flex items-center gap-3 p-3 rounded-lg border bg-card/70 backdrop-blur-sm">
      {isWaiting && (
        <Button disabled={isLoading} onClick={onStartRound}>
          <Play className="h-4 w-4" />
          Start Round
        </Button>
      )}

      {isVoting && (
        <>
          <Button
            disabled={votedCount === 0 || isLoading}
            onClick={onRevealVotes}
          >
            <Eye className="h-4 w-4" />
            Reveal Votes
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <VoteDots votedCount={votedCount} totalVoters={totalVoters} />
            <span className="text-sm font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
              {votedCount}/{totalVoters}
            </span>
          </div>
        </>
      )}

      {isRevealed && (
        <Button disabled={isLoading} onClick={onResetRound}>
          <RefreshCw className="h-4 w-4" />
          New Round
        </Button>
      )}
    </div>
  );
}
