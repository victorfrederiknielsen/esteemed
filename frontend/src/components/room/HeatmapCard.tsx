import { forwardRef } from "react";
import { ProfileCircleStack } from "./ProfileCircleStack";

interface HeatmapCardProps {
  label: string;
  voteCount: number;
  maxVoteCount: number;
  totalVotes: number;
  voterNames: string[];
  isMode: boolean;
}

export const HeatmapCard = forwardRef<HTMLDivElement, HeatmapCardProps>(
  function HeatmapCard(
    { label, voteCount, maxVoteCount, voterNames, isMode },
    ref,
  ) {
    // Calculate opacity: 0.1 for zero votes, linear 0.3-1.0 for votes
    const opacity =
      voteCount === 0 ? 0.1 : 0.3 + (voteCount / maxVoteCount) * 0.7;

    // Primary color: hsl(221.2, 83.2%, 53.3%) converted to hsla
    const backgroundColor = `hsla(221.2, 83.2%, 53.3%, ${opacity})`;

    if (isMode) {
      return (
        <div ref={ref} className="consensus-badge-wrapper">
          <div className="consensus-glow-outer rounded-lg" />
          <div
            className="consensus-badge relative rounded-lg p-3 transition-all duration-500"
            style={{ background: undefined }}
          >
            <div className="flex flex-col items-center gap-2">
              <span className="font-bold text-4xl text-white transition-all duration-500">
                {label}
              </span>
              {voteCount > 0 && (
                <>
                  <span className="text-sm text-white/90 font-medium">
                    {voteCount} vote{voteCount !== 1 ? "s" : ""}
                  </span>
                  <ProfileCircleStack names={voterNames} />
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className="relative rounded-lg p-3 transition-all duration-500"
        style={{ backgroundColor }}
      >
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
  },
);
