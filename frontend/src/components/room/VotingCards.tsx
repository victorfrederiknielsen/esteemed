import {
  CARD_VALUES,
  type CardValue,
  type VoteSummary,
  cardValueToLabel,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";
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
      <div ref={ref} className="bg-white rounded-xl border shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">
          {isRevealed ? "Results" : "Select Your Estimate"}
        </h3>
        <div className="grid grid-cols-5 gap-3 sm:gap-4">
          {CARD_VALUES.map((card) => {
            const voteData = votesByCard?.[card.label];
            const isMode =
              isRevealed &&
              card.label === modeLabel &&
              (voteData?.count || 0) > 0;
            const hasVotes = isRevealed && (voteData?.count || 0) > 0;

            return (
              <div key={card.value} className="relative isolate">
                {/* Glow effect for winning card */}
                {isMode && (
                  <div className="absolute -inset-4 consensus-glow-card rounded-lg pointer-events-none" />
                )}
                <button
                  type="button"
                  ref={isMode ? modeCardRef : undefined}
                  onClick={() => !isRevealed && onSelect(card.value)}
                  disabled={disabled || isRevealed}
                  className={cn(
                    "relative w-full aspect-[3/4] rounded-lg border-2 flex flex-col items-center justify-center transition-all duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    "disabled:cursor-default",
                    // Revealed + is mode (winner)
                    isMode &&
                      "consensus-badge border-transparent text-white shadow-lg",
                    // Revealed + has votes (not winner)
                    !isMode &&
                      hasVotes &&
                      "border-primary/50 bg-primary/20 text-primary",
                    // Revealed + no votes
                    isRevealed &&
                      !hasVotes &&
                      "border-slate-100 bg-slate-50 text-slate-300",
                    // Voting + selected
                    !isRevealed &&
                      selectedValue === card.value &&
                      "border-primary bg-primary text-primary-foreground shadow-lg scale-105 hover:scale-105",
                    // Voting + not selected
                    !isRevealed &&
                      selectedValue !== card.value &&
                      "border-slate-200 bg-white text-slate-700 hover:border-primary/50 hover:scale-105 hover:shadow-md",
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
                        {voteData?.count} vote{voteData?.count !== 1 ? "s" : ""}
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
          <p className="mt-4 text-center text-sm text-slate-600">
            Your vote:{" "}
            <span className="font-semibold">
              {CARD_VALUES.find((c) => c.value === selectedValue)?.label}
            </span>
          </p>
        )}
        {/* Consensus badge */}
        {isRevealed && summary?.hasConsensus && (
          <p className="mt-4 text-center text-sm font-medium text-green-600">
            🎉 Consensus reached!
          </p>
        )}
      </div>
    );
  },
);
