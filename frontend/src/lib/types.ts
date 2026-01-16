// Re-export generated types with helpers
export { CardValue } from "@/gen/esteemed/v1/estimation_pb";
export type { Vote, VoteSummary } from "@/gen/esteemed/v1/estimation_pb";
export { RoomState } from "@/gen/esteemed/v1/room_pb";
export type { Room, Participant } from "@/gen/esteemed/v1/room_pb";

import { CardValue } from "@/gen/esteemed/v1/estimation_pb";

// Card value helpers for UI
export const CARD_VALUES = [
  { value: CardValue.ONE, label: "1", numeric: 1 },
  { value: CardValue.TWO, label: "2", numeric: 2 },
  { value: CardValue.THREE, label: "3", numeric: 3 },
  { value: CardValue.FIVE, label: "5", numeric: 5 },
  { value: CardValue.EIGHT, label: "8", numeric: 8 },
  { value: CardValue.THIRTEEN, label: "13", numeric: 13 },
  { value: CardValue.TWENTY_ONE, label: "21", numeric: 21 },
  { value: CardValue.QUESTION, label: "?", numeric: null },
  { value: CardValue.COFFEE, label: "\u2615", numeric: null },
] as const;

export function cardValueToLabel(value: CardValue): string {
  const card = CARD_VALUES.find((c) => c.value === value);
  return card?.label ?? "";
}
