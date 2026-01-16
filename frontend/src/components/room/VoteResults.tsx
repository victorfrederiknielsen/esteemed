import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { VoteSummary } from "@/gen/types";
import { cardValueToLabel, CARD_VALUES } from "@/gen/types";
import { RefreshCw, Trophy, TrendingUp, Users } from "lucide-react";

interface VoteResultsProps {
  summary: VoteSummary;
  onReset?: () => void;
}

export function VoteResults({ summary, onReset }: VoteResultsProps) {
  // Count votes by value
  const voteCounts = summary.votes.reduce((acc, vote) => {
    const label = cardValueToLabel(vote.value);
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Find the max count for scaling the bars
  const maxCount = Math.max(...Object.values(voteCounts), 1);

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
          <div className="flex justify-center">
            <Badge variant="success" className="px-4 py-1.5">
              Consensus reached!
            </Badge>
          </div>
        )}

        {/* Vote distribution */}
        <div>
          <h4 className="text-sm font-medium text-slate-600 mb-3">Vote Distribution</h4>
          <div className="space-y-2">
            {CARD_VALUES.map((card) => {
              const count = voteCounts[card.label] || 0;
              if (count === 0) return null;

              const percentage = (count / summary.votes.length) * 100;
              const barWidth = (count / maxCount) * 100;

              return (
                <div key={card.value} className="flex items-center gap-3">
                  <span className="w-8 text-right font-mono text-sm font-medium">
                    {card.label}
                  </span>
                  <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${barWidth}%` }}
                    >
                      {barWidth > 20 && (
                        <span className="text-xs font-medium text-white">
                          {count}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="w-12 text-right text-sm text-slate-500">
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Individual votes */}
        <div>
          <h4 className="text-sm font-medium text-slate-600 mb-3">Individual Votes</h4>
          <div className="flex flex-wrap gap-2">
            {summary.votes.map((vote) => (
              <div
                key={vote.participantId}
                className="flex items-center gap-2 bg-slate-50 rounded-full pl-3 pr-1 py-1"
              >
                <span className="text-sm">{vote.participantName}</span>
                <Badge variant="secondary" className="font-mono">
                  {cardValueToLabel(vote.value)}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
