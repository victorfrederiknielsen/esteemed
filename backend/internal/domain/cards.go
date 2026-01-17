package domain

import (
	"errors"
	"math"
	"regexp"
	"strings"
	"unicode"
)

// Errors
var (
	ErrInvalidCardValue  = errors.New("invalid card value")
	ErrTooFewCards       = errors.New("at least 2 cards are required")
	ErrTooManyCards      = errors.New("maximum 15 cards allowed")
	ErrCardValueTooLong  = errors.New("card value must be 10 characters or less")
	ErrInvalidCardPreset = errors.New("invalid card preset")
	ErrEmptyCustomCards  = errors.New("custom cards cannot be empty")
)

// CardPreset represents predefined card deck types
type CardPreset int

// CardPreset constants
const (
	CardPresetUnspecified CardPreset = iota
	CardPresetFibonacci
	CardPresetModifiedFibonacci
	CardPresetTShirt
	CardPresetPowersOfTwo
	CardPresetLinear
	CardPresetCustom
)

// Card represents a single card in the deck
type Card struct {
	Value        string // Display value (e.g., "5", "XL", "?")
	NumericValue int    // Numeric value for averaging (0 if non-numeric)
	IsNumeric    bool   // True if card has a numeric value
}

// CardConfig represents the card deck configuration for a room
type CardConfig struct {
	Preset CardPreset
	Cards  []*Card
}

// Predefined card decks
var (
	FibonacciCards = []*Card{
		{Value: "1", NumericValue: 1, IsNumeric: true},
		{Value: "2", NumericValue: 2, IsNumeric: true},
		{Value: "3", NumericValue: 3, IsNumeric: true},
		{Value: "5", NumericValue: 5, IsNumeric: true},
		{Value: "8", NumericValue: 8, IsNumeric: true},
		{Value: "13", NumericValue: 13, IsNumeric: true},
		{Value: "21", NumericValue: 21, IsNumeric: true},
		{Value: "?", NumericValue: 0, IsNumeric: false},
		{Value: "\u2615", NumericValue: 0, IsNumeric: false}, // Coffee emoji
	}

	ModifiedFibonacciCards = []*Card{
		{Value: "0", NumericValue: 0, IsNumeric: true},
		{Value: "1", NumericValue: 1, IsNumeric: true},
		{Value: "2", NumericValue: 2, IsNumeric: true},
		{Value: "3", NumericValue: 3, IsNumeric: true},
		{Value: "5", NumericValue: 5, IsNumeric: true},
		{Value: "8", NumericValue: 8, IsNumeric: true},
		{Value: "13", NumericValue: 13, IsNumeric: true},
		{Value: "20", NumericValue: 20, IsNumeric: true},
		{Value: "40", NumericValue: 40, IsNumeric: true},
		{Value: "100", NumericValue: 100, IsNumeric: true},
		{Value: "?", NumericValue: 0, IsNumeric: false},
		{Value: "\u2615", NumericValue: 0, IsNumeric: false},
	}

	TShirtCards = []*Card{
		{Value: "XS", NumericValue: 1, IsNumeric: false},
		{Value: "S", NumericValue: 2, IsNumeric: false},
		{Value: "M", NumericValue: 3, IsNumeric: false},
		{Value: "L", NumericValue: 5, IsNumeric: false},
		{Value: "XL", NumericValue: 8, IsNumeric: false},
		{Value: "?", NumericValue: 0, IsNumeric: false},
		{Value: "\u2615", NumericValue: 0, IsNumeric: false},
	}

	PowersOfTwoCards = []*Card{
		{Value: "1", NumericValue: 1, IsNumeric: true},
		{Value: "2", NumericValue: 2, IsNumeric: true},
		{Value: "4", NumericValue: 4, IsNumeric: true},
		{Value: "8", NumericValue: 8, IsNumeric: true},
		{Value: "16", NumericValue: 16, IsNumeric: true},
		{Value: "32", NumericValue: 32, IsNumeric: true},
		{Value: "?", NumericValue: 0, IsNumeric: false},
		{Value: "\u2615", NumericValue: 0, IsNumeric: false},
	}

	LinearCards = []*Card{
		{Value: "1", NumericValue: 1, IsNumeric: true},
		{Value: "2", NumericValue: 2, IsNumeric: true},
		{Value: "3", NumericValue: 3, IsNumeric: true},
		{Value: "4", NumericValue: 4, IsNumeric: true},
		{Value: "5", NumericValue: 5, IsNumeric: true},
		{Value: "6", NumericValue: 6, IsNumeric: true},
		{Value: "7", NumericValue: 7, IsNumeric: true},
		{Value: "8", NumericValue: 8, IsNumeric: true},
		{Value: "9", NumericValue: 9, IsNumeric: true},
		{Value: "10", NumericValue: 10, IsNumeric: true},
		{Value: "?", NumericValue: 0, IsNumeric: false},
		{Value: "\u2615", NumericValue: 0, IsNumeric: false},
	}
)

// GetPresetCards returns the cards for a given preset
func GetPresetCards(preset CardPreset) []*Card {
	switch preset {
	case CardPresetFibonacci:
		return copyCards(FibonacciCards)
	case CardPresetModifiedFibonacci:
		return copyCards(ModifiedFibonacciCards)
	case CardPresetTShirt:
		return copyCards(TShirtCards)
	case CardPresetPowersOfTwo:
		return copyCards(PowersOfTwoCards)
	case CardPresetLinear:
		return copyCards(LinearCards)
	default:
		return copyCards(FibonacciCards)
	}
}

// copyCards creates a deep copy of a card slice
func copyCards(cards []*Card) []*Card {
	result := make([]*Card, len(cards))
	for i, c := range cards {
		result[i] = &Card{
			Value:        c.Value,
			NumericValue: c.NumericValue,
			IsNumeric:    c.IsNumeric,
		}
	}
	return result
}

// DefaultCardConfig returns the default card configuration (Fibonacci)
func DefaultCardConfig() *CardConfig {
	return &CardConfig{
		Preset: CardPresetFibonacci,
		Cards:  GetPresetCards(CardPresetFibonacci),
	}
}

// NewCardConfig creates a card config for a given preset
func NewCardConfig(preset CardPreset) *CardConfig {
	return &CardConfig{
		Preset: preset,
		Cards:  GetPresetCards(preset),
	}
}

// NewCustomCardConfig creates a card config with custom cards
func NewCustomCardConfig(cards []*Card) *CardConfig {
	return &CardConfig{
		Preset: CardPresetCustom,
		Cards:  cards,
	}
}

// controlCharRegex matches control characters except common whitespace
var controlCharRegex = regexp.MustCompile(`[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]`)

// ParseCustomCards parses a comma-separated string of card values
func ParseCustomCards(input string) ([]*Card, error) {
	if strings.TrimSpace(input) == "" {
		return nil, ErrEmptyCustomCards
	}

	parts := strings.Split(input, ",")
	seen := make(map[string]bool)
	cards := make([]*Card, 0, len(parts))

	for _, part := range parts {
		// Trim whitespace
		value := strings.TrimSpace(part)
		if value == "" {
			continue
		}

		// Strip control characters
		value = controlCharRegex.ReplaceAllString(value, "")

		// Check length
		if len(value) > 10 {
			return nil, ErrCardValueTooLong
		}

		// Skip duplicates
		if seen[value] {
			continue
		}
		seen[value] = true

		// Parse numeric value
		numericValue, isNumeric := parseNumericValue(value)

		cards = append(cards, &Card{
			Value:        value,
			NumericValue: numericValue,
			IsNumeric:    isNumeric,
		})
	}

	// Validate card count
	if len(cards) < 2 {
		return nil, ErrTooFewCards
	}
	if len(cards) > 15 {
		return nil, ErrTooManyCards
	}

	return cards, nil
}

// parseNumericValue attempts to parse a string as a number
func parseNumericValue(value string) (int, bool) {
	// Special cases
	if value == "?" || value == "\u2615" {
		return 0, false
	}

	// Try to parse as integer
	var num int
	isNegative := false
	hasDigit := false

	for i, r := range value {
		if i == 0 && r == '-' {
			isNegative = true
			continue
		}
		if !unicode.IsDigit(r) {
			return 0, false
		}
		hasDigit = true
		num = num*10 + int(r-'0')
	}

	if !hasDigit {
		return 0, false
	}

	if isNegative {
		num = -num
	}

	return num, true
}

// ValidateCardValue checks if a value is valid for the room's card config
func ValidateCardValue(config *CardConfig, value string) error {
	if config == nil {
		config = DefaultCardConfig()
	}

	for _, card := range config.Cards {
		if card.Value == value {
			return nil
		}
	}

	return ErrInvalidCardValue
}

// GetCard returns the Card for a given value from the config
func GetCard(config *CardConfig, value string) *Card {
	if config == nil {
		config = DefaultCardConfig()
	}

	for _, card := range config.Cards {
		if card.Value == value {
			return card
		}
	}

	return nil
}

// CalculateNumericAverage calculates the average of numeric votes
func CalculateNumericAverage(config *CardConfig, votes []*Vote) (float64, bool) {
	if config == nil {
		config = DefaultCardConfig()
	}

	var sum float64
	var count int

	for _, v := range votes {
		card := GetCard(config, v.Value)
		if card != nil && card.IsNumeric {
			sum += float64(card.NumericValue)
			count++
		}
	}

	if count == 0 {
		return 0, false
	}

	return sum / float64(count), true
}

// FindNearestCard finds the card with the closest numeric value to the average
func FindNearestCard(config *CardConfig, average float64) *Card {
	if config == nil {
		config = DefaultCardConfig()
	}

	var closest *Card
	minDiff := math.MaxFloat64

	for _, card := range config.Cards {
		if card.IsNumeric {
			diff := math.Abs(average - float64(card.NumericValue))
			if diff < minDiff {
				minDiff = diff
				closest = card
			}
		}
	}

	return closest
}

// CalculateModeValue finds the most common vote value
func CalculateModeValue(votes []*Vote) string {
	if len(votes) == 0 {
		return ""
	}

	counts := make(map[string]int)
	for _, v := range votes {
		counts[v.Value]++
	}

	var mode string
	maxCount := 0
	for value, count := range counts {
		if count > maxCount {
			maxCount = count
			mode = value
		}
	}

	return mode
}

// CheckConsensus returns true if all votes have the same value
func CheckConsensus(votes []*Vote) bool {
	if len(votes) < 2 {
		return len(votes) == 1
	}

	first := votes[0].Value
	for _, v := range votes[1:] {
		if v.Value != first {
			return false
		}
	}

	return true
}
