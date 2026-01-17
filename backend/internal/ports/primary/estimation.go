package primary

import (
	"context"

	"github.com/vicmanager/esteemed/backend/internal/domain"
)

// EstimationService defines the primary port for estimation/voting operations
type EstimationService interface {
	// CastVote submits a vote for the current round
	CastVote(ctx context.Context, roomID, participantID, sessionToken, value string) error

	// RevealVotes reveals all votes (host only)
	RevealVotes(ctx context.Context, roomID, participantID, sessionToken string) (*domain.VoteSummary, error)

	// ResetRound clears all votes and starts a new round
	ResetRound(ctx context.Context, roomID, participantID, sessionToken string) error

	// StartRound begins a new voting round (host only)
	StartRound(ctx context.Context, roomID, participantID, sessionToken string) error

	// WatchVotes returns a channel for vote events
	WatchVotes(ctx context.Context, roomID, sessionToken string) (<-chan VoteEvent, error)
}

// VoteEventType represents types of vote events
type VoteEventType int

// VoteEventType constants represent the types of vote events.
const (
	VoteEventCast VoteEventType = iota
	VoteEventRevealed
	VoteEventReset
)

// VoteEvent represents a real-time vote event
type VoteEvent struct {
	Type            VoteEventType
	ParticipantID   string
	ParticipantName string
	Summary         *domain.VoteSummary
}
