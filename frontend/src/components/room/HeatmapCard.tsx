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

    return (
      <div ref={ref} className="relative h-[120px]">
        {/* Background layer */}
        <div
          className={`absolute inset-0 rounded-lg transition-all duration-500 ${
            isMode ? "consensus-badge" : ""
          }`}
          style={isMode ? undefined : { backgroundColor }}
        />
        {/* Content layer - above background */}
        <div className="relative z-10 h-full p-3 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-1">
            <span
              className={`font-bold text-3xl transition-all duration-500 ${
                voteCount > 0 ? "text-white" : "text-slate-400"
              }`}
            >
              {label}
            </span>
            {/* Always render vote info container to maintain consistent height */}
            <div
              className={`flex flex-col items-center gap-1 transition-opacity duration-300 ${
                voteCount > 0 ? "opacity-100" : "opacity-0"
              }`}
            >
              <span
                className={`text-xs ${isMode ? "text-white/90" : "text-white/80"}`}
              >
                {voteCount || 0} vote{voteCount !== 1 ? "s" : ""}
              </span>
              <div className="h-6">
                {voteCount > 0 && <ProfileCircleStack names={voterNames} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
