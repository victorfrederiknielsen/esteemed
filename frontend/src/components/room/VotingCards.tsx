import {
  CARD_VALUES,
  type CardValue,
  type VoteSummary,
  cardValueToLabel,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { TrendingUp, Trophy, Users } from "lucide-react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { ProfileCircleStack } from "./ProfileCircleStack";

interface VotingCardsProps {
  selectedValue: CardValue | null;
  onSelect: (value: CardValue) => void;
  disabled?: boolean;
  // Results mode
  isRevealed?: boolean;
  summary?: VoteSummary | null;
  modeCardRef?: React.RefObject<HTMLButtonElement>;
}

export const VotingCards = forwardRef<HTMLDivElement, VotingCardsProps>(
  function VotingCards(
    { selectedValue, onSelect, disabled, isRevealed, summary, modeCardRef },
    ref,
  ) {
    const gridRef = useRef<HTMLDivElement>(null);
    const internalModeCardRef = useRef<HTMLButtonElement>(null);
    const [glowPosition, setGlowPosition] = useState<{
      top: number;
      left: number;
      width: number;
      height: number;
    } | null>(null);

    // Calculate glow position relative to grid
    useEffect(() => {
      const timeout = setTimeout(() => {
        const cardEl = modeCardRef?.current || internalModeCardRef.current;
        if (cardEl && gridRef.current && isRevealed) {
          const cardRect = cardEl.getBoundingClientRect();
          const gridRect = gridRef.current.getBoundingClientRect();
          setGlowPosition({
            top: cardRect.top - gridRect.top,
            left: cardRect.left - gridRect.left,
            width: cardRect.width,
            height: cardRect.height,
          });
        } else {
          setGlowPosition(null);
        }
      }, 50);
      return () => clearTimeout(timeout);
    }, [isRevealed, summary, modeCardRef]);

    // Build vote data when revealed
    const votesByCard = summary?.votes.reduce(
      (acc, vote) => {
        const label = cardValueToLabel(vote.value);
        if (!acc[label]) acc[label] = { count: 0, names: [] as string[] };
        acc[label].count += 1;
        acc[label].names.push(vote.participantName);
        return acc;
      },
      {} as Record<string, { count: number; names: string[] }>,
    );

    const modeLabel = summary ? cardValueToLabel(summary.mode) : null;

    return (
      <div
        ref={(el) => {
          // Handle both refs
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
          (gridRef as React.MutableRefObject<HTMLDivElement | null>).current =
            el;
        }}
        className="relative isolate"
      >
        {/* Glow effect - only on consensus */}
        {glowPosition && summary?.hasConsensus && (
          <div
            className="absolute z-0 consensus-glow-card rounded-full pointer-events-none"
            style={{
              top: glowPosition.top - 450,
              left: glowPosition.left - 450,
              width: glowPosition.width + 900,
              height: glowPosition.height + 900,
            }}
          />
        )}
        <div className="relative z-10 bg-white/70 dark:bg-neutral-800/70 backdrop-blur-sm rounded-xl border shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">
            {isRevealed ? "Results" : "Select Your Estimate"}
          </h3>
          <div className="grid grid-cols-5 gap-3 sm:gap-4">
            {CARD_VALUES.map((card) => {
              const voteData = votesByCard?.[card.label];
              const isMode =
                isRevealed &&
                summary?.hasConsensus &&
                card.label === modeLabel &&
                (voteData?.count || 0) > 0;
              const hasVotes = isRevealed && (voteData?.count || 0) > 0;

              return (
                <div key={card.value} className="relative">
                  <button
                    type="button"
                    ref={
                      isMode ? modeCardRef || internalModeCardRef : undefined
                    }
                    onClick={() => !isRevealed && onSelect(card.value)}
                    disabled={disabled || isRevealed}
                    className={cn(
                      "relative w-full aspect-[3/4] rounded-lg border-2 flex flex-col items-center justify-center transition-all duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-neutral-900",
                      "disabled:cursor-default backdrop-blur-md bg-white/40 dark:bg-neutral-700/40",
                      // Revealed + is mode (winner)
                      isMode &&
                        "consensus-badge border-transparent text-white shadow-lg !bg-transparent",
                      // Revealed + has votes (not winner)
                      !isMode && hasVotes && "border-primary/50 text-primary",
                      // Revealed + no votes
                      isRevealed &&
                        !hasVotes &&
                        "border-neutral-200/50 dark:border-neutral-600/50 text-neutral-400",
                      // Voting + selected
                      !isRevealed &&
                        selectedValue === card.value &&
                        "border-primary text-primary shadow-lg scale-105 hover:scale-105",
                      // Voting + not selected
                      !isRevealed &&
                        selectedValue !== card.value &&
                        "border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:border-primary/50 hover:scale-105 hover:shadow-md",
                    )}
                  >
                    <span
                      className={cn(
                        "font-bold transition-all duration-200",
                        hasVotes || selectedValue === card.value
                          ? "text-2xl sm:text-3xl"
                          : "text-xl sm:text-2xl",
                      )}
                    >
                      {card.label}
                    </span>
                    {/* Vote info when revealed */}
                    {isRevealed && hasVotes && (
                      <div className="flex flex-col items-center gap-1 mt-1">
                        <span
                          className={cn(
                            "text-xs",
                            isMode ? "text-white/90" : "text-primary/70",
                          )}
                        >
                          {voteData?.count} vote
                          {voteData?.count !== 1 ? "s" : ""}
                        </span>
                        <ProfileCircleStack
                          names={voteData?.names || []}
                          maxVisible={3}
                        />
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
          {!isRevealed && selectedValue !== null && (
            <p className="mt-4 text-center text-sm text-neutral-600 dark:text-neutral-400">
              Your vote:{" "}
              <span className="font-semibold">
                {CARD_VALUES.find((c) => c.value === selectedValue)?.label}
              </span>
            </p>
          )}
          {/* Statistics - shown when revealed */}
          {isRevealed && summary && (
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center p-3 bg-white/50 dark:bg-neutral-700/50 backdrop-blur-sm rounded-lg">
                <div className="flex items-center justify-center gap-1 text-neutral-600 dark:text-neutral-400 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">Average</span>
                </div>
                <span className="text-2xl font-bold text-primary">
                  {cardValueToLabel(summary.average) || "-"}
                </span>
              </div>
              <div className="text-center p-3 bg-white/50 dark:bg-neutral-700/50 backdrop-blur-sm rounded-lg">
                <div className="flex items-center justify-center gap-1 text-neutral-600 dark:text-neutral-400 mb-1">
                  <Trophy className="h-4 w-4" />
                  <span className="text-xs font-medium">Mode</span>
                </div>
                <span className="text-2xl font-bold text-primary">
                  {cardValueToLabel(summary.mode) || "-"}
                </span>
              </div>
              <div className="text-center p-3 bg-white/50 dark:bg-neutral-700/50 backdrop-blur-sm rounded-lg">
                <div className="flex items-center justify-center gap-1 text-neutral-600 dark:text-neutral-400 mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-medium">Votes</span>
                </div>
                <span className="text-2xl font-bold text-primary">
                  {summary.votes.length}
                </span>
              </div>
            </div>
          )}
          {/* Consensus badge */}
          {isRevealed && summary?.hasConsensus && (
            <p className="mt-4 text-center text-sm font-medium text-green-600">
              🎉 Consensus reached!
            </p>
          )}
        </div>
      </div>
    );
  },
);
