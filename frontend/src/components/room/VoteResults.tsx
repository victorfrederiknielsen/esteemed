import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VoteSummary } from "@/lib/types";
import { CARD_VALUES, cardValueToLabel } from "@/lib/types";
import confetti from "canvas-confetti";
import { RefreshCw, TrendingUp, Trophy, Users } from "lucide-react";
import { useEffect, useRef } from "react";
import { HeatmapCard } from "./HeatmapCard";

interface VoteResultsProps {
  summary: VoteSummary;
  onReset?: () => void;
}

export function VoteResults({ summary, onReset }: VoteResultsProps) {
  const hasTriggeredConfetti = useRef(false);

  // Trigger confetti when consensus is reached
  useEffect(() => {
    if (summary.hasConsensus && !hasTriggeredConfetti.current) {
      hasTriggeredConfetti.current = true;

      // Fire confetti from both sides
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ["#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ["#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b"],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [summary.hasConsensus]);

  // Reset confetti trigger when summary changes (new round)
  useEffect(() => {
    if (!summary.hasConsensus) {
      hasTriggeredConfetti.current = false;
    }
  }, [summary.hasConsensus]);

  // Track votes by card value with voter names
  const votesByCard = summary.votes.reduce(
    (acc, vote) => {
      const label = cardValueToLabel(vote.value);
      if (!acc[label]) acc[label] = { count: 0, names: [] as string[] };
      acc[label].count += 1;
      acc[label].names.push(vote.participantName);
      return acc;
    },
    {} as Record<string, { count: number; names: string[] }>,
  );

  // Find the max count for scaling the heatmap
  const maxCount = Math.max(
    ...Object.values(votesByCard).map((v) => v.count),
    1,
  );

  // Get mode label for highlighting
  const modeLabel = cardValueToLabel(summary.mode);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Results</CardTitle>
          {onReset && (
            <Button variant="outline" size="sm" onClick={onReset}>
              <RefreshCw className="h-4 w-4 mr-1" />
              New Round
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-slate-600 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">Average</span>
            </div>
            <span className="text-2xl font-bold text-primary">
              {cardValueToLabel(summary.average) || "-"}
            </span>
          </div>

          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-slate-600 mb-1">
              <Trophy className="h-4 w-4" />
              <span className="text-xs font-medium">Mode</span>
            </div>
            <span className="text-2xl font-bold text-primary">
              {cardValueToLabel(summary.mode) || "-"}
            </span>
          </div>

          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-slate-600 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Votes</span>
            </div>
            <span className="text-2xl font-bold text-primary">
              {summary.votes.length}
            </span>
          </div>
        </div>

        {/* Consensus badge */}
        {summary.hasConsensus && (
          <div className="flex justify-center py-2">
            <div className="consensus-badge rounded-full px-6 py-2 shadow-lg">
              <span className="text-base font-semibold text-white drop-shadow-md">
                🎉 Consensus reached! 🎉
              </span>
            </div>
          </div>
        )}

        {/* Vote heatmap */}
        <div>
          <h4 className="text-sm font-medium text-slate-600 mb-3">
            Vote Distribution
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {CARD_VALUES.map((card) => (
              <HeatmapCard
                key={card.value}
                label={card.label}
                voteCount={votesByCard[card.label]?.count || 0}
                maxVoteCount={maxCount}
                totalVotes={summary.votes.length}
                voterNames={votesByCard[card.label]?.names || []}
                isMode={
                  card.label === modeLabel &&
                  (votesByCard[card.label]?.count || 0) > 0
                }
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
