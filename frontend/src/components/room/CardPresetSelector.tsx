import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Card, CardConfig } from "@/gen/esteemed/v1/room_pb";
import { CardPreset } from "@/gen/esteemed/v1/room_pb";
import {
  CARD_PRESETS,
  createCustomCardConfig,
  createPresetCardConfig,
  parseCustomCards,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

interface CardPresetSelectorProps {
  value: CardConfig;
  onChange: (config: CardConfig) => void;
  disabled?: boolean;
}

export function CardPresetSelector({
  value,
  onChange,
  disabled,
}: CardPresetSelectorProps) {
  const [customInput, setCustomInput] = useState("");
  const [customError, setCustomError] = useState<string | undefined>();

  const selectedPreset = value.preset;

  const handlePresetSelect = useCallback(
    (preset: CardPreset) => {
      if (preset === CardPreset.CUSTOM) {
        // When switching to custom, try to parse current input
        const result = parseCustomCards(customInput);
        if (result.error) {
          setCustomError(result.error);
          // Still switch to custom mode but with empty cards
          onChange(createCustomCardConfig([]));
        } else {
          setCustomError(undefined);
          onChange(createCustomCardConfig(result.cards));
        }
      } else {
        setCustomError(undefined);
        onChange(createPresetCardConfig(preset));
      }
    },
    [customInput, onChange],
  );

  const handleCustomInputChange = useCallback(
    (input: string) => {
      setCustomInput(input);
      const result = parseCustomCards(input);
      if (result.error) {
        setCustomError(result.error);
        onChange(createCustomCardConfig([]));
      } else {
        setCustomError(undefined);
        onChange(createCustomCardConfig(result.cards));
      }
    },
    [onChange],
  );

  // Get cards to display for preview
  const previewCards = useMemo(() => {
    if (selectedPreset === CardPreset.CUSTOM) {
      return value.cards;
    }
    const presetDef = CARD_PRESETS.find((p) => p.preset === selectedPreset);
    return presetDef?.cards || [];
  }, [selectedPreset, value.cards]);

  return (
    <div className="space-y-2">
      <Label>Card Deck</Label>
      <Select
        value={String(selectedPreset)}
        onValueChange={(val) => handlePresetSelect(Number(val) as CardPreset)}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a card deck" />
        </SelectTrigger>
        <SelectContent>
          {CARD_PRESETS.map((preset) => (
            <PresetOption
              key={preset.preset}
              value={String(preset.preset)}
              name={preset.name}
              cards={preset.cards.map((c) => c.value).join(", ")}
            />
          ))}
          <SelectItem value={String(CardPreset.CUSTOM)}>Custom</SelectItem>
        </SelectContent>
      </Select>

      {/* Custom input field */}
      {selectedPreset === CardPreset.CUSTOM && (
        <div className="space-y-2">
          <Input
            placeholder="e.g., 1, 2, 3, 5, 8, ?"
            value={customInput}
            onChange={(e) => handleCustomInputChange(e.target.value)}
            disabled={disabled}
            className={cn(customError && "border-red-500")}
          />
          {customError && <p className="text-xs text-red-500">{customError}</p>}
        </div>
      )}

      {/* Card preview */}
      <CardPreview cards={previewCards} />
    </div>
  );
}

interface CardPreviewProps {
  cards: Card[];
}

function CardPreview({ cards }: CardPreviewProps) {
  if (cards.length === 0) {
    return (
      <div className="text-xs text-neutral-400 text-center py-2">
        No cards to preview
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {cards.map((card, index) => (
        <span
          key={`${card.value}-${index}`}
          className="inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded border border-neutral-200 dark:border-neutral-700 bg-card text-sm font-medium"
        >
          {card.value}
        </span>
      ))}
    </div>
  );
}

interface PresetOptionProps {
  value: string;
  name: string;
  cards: string;
}

function PresetOption({ value, name, cards }: PresetOptionProps) {
  return (
    <SelectPrimitive.Item
      value={value}
      textValue={name}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default flex-col items-start rounded-sm py-2 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      )}
    >
      <span className="absolute right-2 top-2.5 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{name}</SelectPrimitive.ItemText>
      <span className="text-xs text-muted-foreground mt-0.5">{cards}</span>
    </SelectPrimitive.Item>
  );
}
