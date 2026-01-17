import { useTilt3D } from "@/hooks/useTilt3D";
import { forwardRef, useCallback } from "react";
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
    forwardedRef,
  ) {
    const { ref: tiltRef, style: tiltStyle } =
      useTilt3D<HTMLDivElement>(isMode);

    // Merge refs using callback ref
    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        (tiltRef as React.MutableRefObject<HTMLDivElement | null>).current =
          node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef, tiltRef],
    );

    // Calculate lightness: higher votes = darker/more saturated
    // Zero votes: very light (85%), max votes: fully saturated primary (53%)
    const lightness =
      voteCount === 0 ? 85 : 85 - (voteCount / maxVoteCount) * 32;

    // Primary color with varying lightness for solid background
    const backgroundColor = `hsl(221.2, 83.2%, ${lightness}%)`;

    return (
      <div
        ref={setRefs}
        className={`relative h-[120px] rounded-lg ${isMode ? "consensus-badge" : ""}`}
        style={isMode ? tiltStyle : undefined}
      >
        {/* Background layer */}
        <div
          className="absolute inset-0 rounded-lg transition-all duration-500"
          style={{ backgroundColor }}
        />
        {/* Content layer - above background */}
        <div className="relative z-10 h-full p-3 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-1">
            <span
              className={`font-bold text-3xl transition-all duration-500 ${
                voteCount > 0 ? "text-white" : "text-neutral-500"
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
