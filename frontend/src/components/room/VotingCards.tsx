import { Tilt3DWrapper } from "@/components/ui/Tilt3DWrapper";
import {
  CARD_VALUES,
  type CardValue,
  type VoteSummary,
  cardValueToLabel,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { TrendingUp, Trophy, Users } from "lucide-react";
import { forwardRef, useMemo, useRef } from "react";
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

    // Build vote data when revealed
    const votesByCard = useMemo(
      () =>
        summary?.votes.reduce(
          (acc, vote) => {
            const label = cardValueToLabel(vote.value);
            if (!acc[label]) acc[label] = { count: 0, names: [] as string[] };
            acc[label].count += 1;
            acc[label].names.push(vote.participantName);
            return acc;
          },
          {} as Record<string, { count: number; names: string[] }>,
        ),
      [summary?.votes],
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
        className="relative"
      >
        <div className="bg-card/70 backdrop-blur-sm rounded-lg border shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">
            {isRevealed ? "Results" : "Select Your Estimate"}
          </h3>
          <div className="grid grid-cols-5 gap-3 sm:gap-4">
            {CARD_VALUES.map((card) => {
              const voteData = votesByCard?.[card.label];
              const isMode = !!(
                isRevealed &&
                summary?.hasConsensus &&
                card.label === modeLabel &&
                (voteData?.count || 0) > 0
              );
              const hasVotes = isRevealed && (voteData?.count || 0) > 0;

              return (
                <Tilt3DWrapper
                  key={card.value}
                  enabled={isMode}
                  className={cn(
                    "relative rounded-lg",
                    isMode && "consensus-badge",
                  )}
                >
                  <button
                    type="button"
                    ref={isMode ? modeCardRef : undefined}
                    onClick={() => !isRevealed && onSelect(card.value)}
                    disabled={disabled || isRevealed}
                    className={cn(
                      "relative w-full aspect-[3/4] rounded-lg border-2 flex flex-col items-center justify-center transition-all duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-neutral-900",
                      "disabled:cursor-default bg-card",
                      // Revealed + is mode (winner)
                      isMode && "border-transparent text-foreground shadow-lg",
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
                            isMode
                              ? "text-muted-foreground"
                              : "text-primary/70",
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
                </Tilt3DWrapper>
              );
            })}
          </div>
          {/* Statistics - shown when revealed */}
          {isRevealed && summary && (
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center p-3 bg-card/50 backdrop-blur-sm rounded-lg">
                <div className="flex items-center justify-center gap-1 text-neutral-600 dark:text-neutral-400 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">Average</span>
                </div>
                <span className="text-2xl font-bold text-primary">
                  {cardValueToLabel(summary.average) || "-"}
                </span>
              </div>
              <div className="text-center p-3 bg-card/50 backdrop-blur-sm rounded-lg">
                <div className="flex items-center justify-center gap-1 text-neutral-600 dark:text-neutral-400 mb-1">
                  <Trophy className="h-4 w-4" />
                  <span className="text-xs font-medium">Mode</span>
                </div>
                <span className="text-2xl font-bold text-primary">
                  {cardValueToLabel(summary.mode) || "-"}
                </span>
              </div>
              <div className="text-center p-3 bg-card/50 backdrop-blur-sm rounded-lg">
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
        </div>
      </div>
    );
  },
);
