// Re-export generated types with helpers
export { CardPreset, Card, CardConfig } from "@/gen/esteemed/v1/room_pb";
export type { Room, Participant } from "@/gen/esteemed/v1/room_pb";
export { RoomState } from "@/gen/esteemed/v1/room_pb";
export type { Vote, VoteSummary } from "@/gen/esteemed/v1/estimation_pb";

import { Card, CardConfig, CardPreset } from "@/gen/esteemed/v1/room_pb";

// Card preset definition for UI
export interface CardPresetDefinition {
  preset: CardPreset;
  name: string;
  description: string;
  cards: Card[];
}

// Helper to create a card object
function createCard(
  value: string,
  numericValue: number,
  isNumeric: boolean,
): Card {
  return new Card({ value, numericValue, isNumeric });
}

// Predefined card presets
export const CARD_PRESETS: CardPresetDefinition[] = [
  {
    preset: CardPreset.FIBONACCI,
    name: "Fibonacci",
    description: "Classic planning poker (1, 2, 3, 5, 8, 13, 21)",
    cards: [
      createCard("1", 1, true),
      createCard("2", 2, true),
      createCard("3", 3, true),
      createCard("5", 5, true),
      createCard("8", 8, true),
      createCard("13", 13, true),
      createCard("21", 21, true),
      createCard("?", 0, false),
      createCard("\u2615", 0, false),
    ],
  },
  {
    preset: CardPreset.TSHIRT,
    name: "T-Shirt Sizes",
    description: "Relative sizing (XS, S, M, L, XL)",
    cards: [
      createCard("XS", 1, false),
      createCard("S", 2, false),
      createCard("M", 3, false),
      createCard("L", 5, false),
      createCard("XL", 8, false),
      createCard("?", 0, false),
      createCard("\u2615", 0, false),
    ],
  },
];

// Get the default Fibonacci preset
export function getDefaultCardConfig(): CardConfig {
  const fibonacciPreset = CARD_PRESETS.find(
    (p) => p.preset === CardPreset.FIBONACCI,
  );
  return new CardConfig({
    preset: CardPreset.FIBONACCI,
    cards: fibonacciPreset?.cards || [],
  });
}

// Get cards for a preset
export function getPresetCards(preset: CardPreset): Card[] {
  const presetDef = CARD_PRESETS.find((p) => p.preset === preset);
  return presetDef?.cards || [];
}

// Parse custom cards from comma-separated input
export function parseCustomCards(input: string): {
  cards: Card[];
  error?: string;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return { cards: [], error: "Enter at least 2 card values" };
  }

  const parts = trimmed.split(",");
  const seen = new Set<string>();
  const cards: Card[] = [];

  for (const part of parts) {
    const value = part.trim();
    if (!value) continue;

    // Check length
    if (value.length > 10) {
      return { cards: [], error: `Card "${value}" is too long (max 10 chars)` };
    }

    // Skip duplicates
    if (seen.has(value)) continue;
    seen.add(value);

    // Try to parse as number
    const num = Number.parseInt(value, 10);
    const isNumeric = !Number.isNaN(num) && value !== "?" && value !== "\u2615";

    cards.push(createCard(value, isNumeric ? num : 0, isNumeric));
  }

  if (cards.length < 2) {
    return { cards: [], error: "At least 2 cards are required" };
  }

  if (cards.length > 15) {
    return { cards: [], error: "Maximum 15 cards allowed" };
  }

  return { cards };
}

// Create a custom card config
export function createCustomCardConfig(cards: Card[]): CardConfig {
  return new CardConfig({
    preset: CardPreset.CUSTOM,
    cards,
  });
}

// Create a preset card config
export function createPresetCardConfig(preset: CardPreset): CardConfig {
  return new CardConfig({
    preset,
    cards: getPresetCards(preset),
  });
}

// Legacy helper for backward compatibility - converts card value to label
// Now just returns the value since it's already a string
export function cardValueToLabel(value: string): string {
  return value || "";
}
