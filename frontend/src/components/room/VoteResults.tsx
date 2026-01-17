import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VoteSummary } from "@/lib/types";
import { CARD_VALUES, cardValueToLabel } from "@/lib/types";
import confetti from "canvas-confetti";
import { TrendingUp, Trophy, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { HeatmapCard } from "./HeatmapCard";

interface VoteResultsProps {
  summary: VoteSummary;
}

export function VoteResults({ summary }: VoteResultsProps) {
  const hasTriggeredConfetti = useRef(false);
  const modeCardRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [glowPosition, setGlowPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  // Calculate glow position relative to grid
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (modeCardRef.current && gridRef.current) {
        const cardRect = modeCardRef.current.getBoundingClientRect();
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
  }, [summary]);

  // Trigger confetti from the mode card
  useEffect(() => {
    if (!hasTriggeredConfetti.current) {
      // Small delay to allow card to render and get position
      const timeout = setTimeout(() => {
        if (!modeCardRef.current || hasTriggeredConfetti.current) return;
        hasTriggeredConfetti.current = true;

        // Get mode card position to spawn confetti from it
        const rect = modeCardRef.current.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;

        // Initial burst from the card
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { x, y },
          colors: [
            "#22c55e",
            "#10b981",
            "#06b6d4",
            "#8b5cf6",
            "#ec4899",
            "#f59e0b",
          ],
        });

        // Continuous spray from card
        const duration = 2500;
        const end = Date.now() + duration;

        const frame = () => {
          confetti({
            particleCount: 4,
            angle: 60 + Math.random() * 60,
            spread: 60,
            origin: { x, y },
            colors: [
              "#22c55e",
              "#10b981",
              "#06b6d4",
              "#8b5cf6",
              "#ec4899",
              "#f59e0b",
            ],
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };

        frame();
      }, 100);

      return () => clearTimeout(timeout);
    }
  }, []);

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
        <CardTitle className="text-lg">Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-neutral-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-neutral-600 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">Average</span>
            </div>
            <span className="text-2xl font-bold text-primary">
              {cardValueToLabel(summary.average) || "-"}
            </span>
          </div>

          <div className="text-center p-3 bg-neutral-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-neutral-600 mb-1">
              <Trophy className="h-4 w-4" />
              <span className="text-xs font-medium">Mode</span>
            </div>
            <span className="text-2xl font-bold text-primary">
              {cardValueToLabel(summary.mode) || "-"}
            </span>
          </div>

          <div className="text-center p-3 bg-neutral-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-neutral-600 mb-1">
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
          <div className="flex justify-center">
            <Badge variant="success" className="px-4 py-1.5 text-sm">
              🎉 Consensus reached!
            </Badge>
          </div>
        )}

        {/* Vote heatmap */}
        <div className="overflow-visible">
          <h4 className="text-sm font-medium text-neutral-600 mb-3">
            Vote Distribution
          </h4>
          <div
            ref={gridRef}
            className="relative py-4"
            style={{
              background: glowPosition ? "rgba(255,0,0,0.3)" : undefined,
            }}
          >
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {CARD_VALUES.map((card) => {
                const isMode =
                  card.label === modeLabel &&
                  (votesByCard[card.label]?.count || 0) > 0;
                return (
                  <HeatmapCard
                    key={card.value}
                    ref={isMode ? modeCardRef : undefined}
                    label={card.label}
                    voteCount={votesByCard[card.label]?.count || 0}
                    maxVoteCount={maxCount}
                    totalVotes={summary.votes.length}
                    voterNames={votesByCard[card.label]?.names || []}
                    isMode={isMode}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
