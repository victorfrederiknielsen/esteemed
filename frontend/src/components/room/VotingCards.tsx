import { cn } from "@/lib/utils";
import { CardValue, CARD_VALUES } from "@/gen/types";

interface VotingCardsProps {
  selectedValue: CardValue | null;
  onSelect: (value: CardValue) => void;
  disabled?: boolean;
}

export function VotingCards({ selectedValue, onSelect, disabled }: VotingCardsProps) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">Select Your Estimate</h3>
      <div className="grid grid-cols-5 gap-3 sm:gap-4">
        {CARD_VALUES.map((card) => (
          <button
            key={card.value}
            onClick={() => onSelect(card.value)}
            disabled={disabled}
            className={cn(
              "aspect-[3/4] rounded-lg border-2 flex items-center justify-center text-2xl sm:text-3xl font-bold transition-all duration-200",
              "hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none",
              selectedValue === card.value
                ? "border-primary bg-primary text-primary-foreground shadow-lg scale-105"
                : "border-slate-200 bg-white text-slate-700 hover:border-primary/50"
            )}
          >
            {card.label}
          </button>
        ))}
      </div>
      {selectedValue !== null && (
        <p className="mt-4 text-center text-sm text-slate-600">
          Your vote: <span className="font-semibold">{CARD_VALUES.find(c => c.value === selectedValue)?.label}</span>
        </p>
      )}
    </div>
  );
}
