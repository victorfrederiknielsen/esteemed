import { Badge } from "@/components/ui/badge";
import { ProfileCircleStack } from "./ProfileCircleStack";

interface HeatmapCardProps {
  label: string;
  voteCount: number;
  maxVoteCount: number;
  totalVotes: number;
  voterNames: string[];
  isMode: boolean;
}

export function HeatmapCard({
  label,
  voteCount,
  maxVoteCount,
  voterNames,
  isMode,
}: HeatmapCardProps) {
  // Calculate opacity: 0.1 for zero votes, linear 0.3-1.0 for votes
  const opacity =
    voteCount === 0 ? 0.1 : 0.3 + (voteCount / maxVoteCount) * 0.7;

  // Primary color: hsl(221.2, 83.2%, 53.3%) converted to hsla
  const backgroundColor = `hsla(221.2, 83.2%, 53.3%, ${opacity})`;

  return (
    <div
      className={`relative rounded-lg p-3 transition-all duration-500 ${
        isMode ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
      style={{ backgroundColor }}
    >
      {isMode && (
        <Badge
          variant="default"
          className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5"
        >
          MODE
        </Badge>
      )}
      <div className="flex flex-col items-center gap-2">
        <span
          className={`font-bold transition-all duration-500 ${
            voteCount > 0 ? "text-3xl text-white" : "text-xl text-slate-400"
          }`}
        >
          {label}
        </span>
        {voteCount > 0 && (
          <>
            <span className="text-xs text-white/80">
              {voteCount} vote{voteCount !== 1 ? "s" : ""}
            </span>
            <ProfileCircleStack names={voterNames} />
          </>
        )}
      </div>
    </div>
  );
}
