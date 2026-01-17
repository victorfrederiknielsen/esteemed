import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoomState } from "@/hooks/useRoom";
import { Eye, MoreVertical, Play, RefreshCw } from "lucide-react";

interface HostActionBarProps {
  roomState: RoomState | undefined;
  isRevealed: boolean;
  votedCount: number;
  isLoading: boolean;
  onStartRound: () => void;
  onRevealVotes: () => void;
  onResetRound: () => void;
}

export function HostActionBar({
  roomState,
  isRevealed,
  votedCount,
  isLoading,
  onStartRound,
  onRevealVotes,
  onResetRound,
}: HostActionBarProps) {
  const isWaiting = roomState === RoomState.WAITING;
  const isVoting = roomState === RoomState.VOTING && !isRevealed;

  return (
    <div className="relative z-10 flex items-center gap-2 p-3 rounded-lg border bg-white/70 dark:bg-neutral-800/70 backdrop-blur-sm">
      {isWaiting && (
        <Button disabled={isLoading} onClick={onStartRound}>
          <Play className="h-4 w-4" />
          Start Round
        </Button>
      )}

      {isVoting && (
        <Button
          disabled={votedCount === 0 || isLoading}
          onClick={onRevealVotes}
        >
          <Eye className="h-4 w-4" />
          Reveal Votes
        </Button>
      )}

      {isRevealed && (
        <Button disabled={isLoading} onClick={onResetRound}>
          <RefreshCw className="h-4 w-4" />
          New Round
        </Button>
      )}

      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled>Transfer Ownership</DropdownMenuItem>
            <DropdownMenuItem disabled>End Session</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
