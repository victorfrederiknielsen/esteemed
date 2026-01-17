package app

import (
	"context"

	"github.com/vicmanager/esteemed/backend/internal/domain"
	"github.com/vicmanager/esteemed/backend/internal/ports/primary"
	"github.com/vicmanager/esteemed/backend/internal/ports/secondary"
)

// EstimationService implements the primary.EstimationService interface
type EstimationService struct {
	repo      secondary.RoomRepository
	publisher secondary.EventPublisher
}

// NewEstimationService creates a new estimation service
func NewEstimationService(repo secondary.RoomRepository, publisher secondary.EventPublisher) *EstimationService {
	return &EstimationService{
		repo:      repo,
		publisher: publisher,
	}
}

// CastVote submits a vote for the current round
func (s *EstimationService) CastVote(ctx context.Context, roomID, participantID, sessionToken, value string) error {
	room, err := s.repo.FindByID(ctx, roomID)
	if err != nil {
		return err
	}

	// Validate token
	if err := room.ValidateToken(participantID, sessionToken); err != nil {
		return err
	}

	// Get participant for name
	participant, err := room.GetParticipant(participantID)
	if err != nil {
		return err
	}

	// Cast the vote
	if err := room.CastVote(participantID, value); err != nil {
		return err
	}

	room.TouchActivity()

	if err := s.repo.Save(ctx, room); err != nil {
		return err
	}

	// Publish vote event (without the value - hidden until reveal)
	_ = s.publisher.PublishVoteEvent(ctx, room.ID, primary.VoteEvent{
		Type:            primary.VoteEventCast,
		ParticipantID:   participantID,
		ParticipantName: participant.Name,
	})

	return nil
}

// RevealVotes reveals all votes (host only)
func (s *EstimationService) RevealVotes(ctx context.Context, roomID, participantID, sessionToken string) (*domain.VoteSummary, error) {
	room, err := s.repo.FindByID(ctx, roomID)
	if err != nil {
		return nil, err
	}

	// Validate token
	if err := room.ValidateToken(participantID, sessionToken); err != nil {
		return nil, err
	}

	// Check if host
	if !room.IsHost(participantID) {
		return nil, domain.ErrNotHost
	}

	// Reveal votes
	summary, err := room.RevealVotes()
	if err != nil {
		return nil, err
	}

	room.TouchActivity()

	if err := s.repo.Save(ctx, room); err != nil {
		return nil, err
	}

	// Publish reveal event
	_ = s.publisher.PublishVoteEvent(ctx, room.ID, primary.VoteEvent{
		Type:    primary.VoteEventRevealed,
		Summary: summary,
	})

	// Also publish room state change
	_ = s.publisher.PublishRoomEvent(ctx, room.ID, primary.RoomEvent{
		Type:     primary.RoomEventStateChanged,
		NewState: domain.RoomStateRevealed,
	})

	return summary, nil
}

// ResetRound clears all votes and starts a new round
func (s *EstimationService) ResetRound(ctx context.Context, roomID, participantID, sessionToken string) error {
	room, err := s.repo.FindByID(ctx, roomID)
	if err != nil {
		return err
	}

	// Validate token
	if err := room.ValidateToken(participantID, sessionToken); err != nil {
		return err
	}

	// Check if host
	if !room.IsHost(participantID) {
		return domain.ErrNotHost
	}

	// Reset round
	room.ResetRound()

	room.TouchActivity()

	if err := s.repo.Save(ctx, room); err != nil {
		return err
	}

	// Publish reset event
	_ = s.publisher.PublishVoteEvent(ctx, room.ID, primary.VoteEvent{
		Type: primary.VoteEventReset,
	})

	// Also publish room state change
	_ = s.publisher.PublishRoomEvent(ctx, room.ID, primary.RoomEvent{
		Type:     primary.RoomEventStateChanged,
		NewState: domain.RoomStateVoting,
	})

	return nil
}

// StartRound begins a new voting round (host only)
func (s *EstimationService) StartRound(ctx context.Context, roomID, participantID, sessionToken string) error {
	room, err := s.repo.FindByID(ctx, roomID)
	if err != nil {
		return err
	}

	// Validate token
	if err := room.ValidateToken(participantID, sessionToken); err != nil {
		return err
	}

	// Check if host
	if !room.IsHost(participantID) {
		return domain.ErrNotHost
	}

	// Start voting if in waiting state
	if room.GetState() != domain.RoomStateWaiting {
		return domain.ErrInvalidState
	}

	room.StartVoting()

	room.TouchActivity()

	if err := s.repo.Save(ctx, room); err != nil {
		return err
	}

	// Publish state change event
	_ = s.publisher.PublishRoomEvent(ctx, room.ID, primary.RoomEvent{
		Type:     primary.RoomEventStateChanged,
		NewState: domain.RoomStateVoting,
	})

	return nil
}

// WatchVotes returns a channel for vote events
func (s *EstimationService) WatchVotes(ctx context.Context, roomID, sessionToken string) (<-chan primary.VoteEvent, error) {
	// Verify room exists
	room, err := s.repo.FindByID(ctx, roomID)
	if err != nil {
		room, err = s.repo.FindByName(ctx, roomID)
		if err != nil {
			return nil, err
		}
	}

	// Capture initial state before subscribing to avoid race conditions
	initialVoteStatus := room.GetVoteStatus()
	roomState := room.GetState()
	var initialSummary *domain.VoteSummary
	if roomState == domain.RoomStateRevealed {
		initialSummary, _ = room.GetVoteSummary()
	}

	// Subscribe to events
	eventCh, unsubscribe := s.publisher.SubscribeVoteEvents(ctx, room.ID)

	// Create output channel that handles context cancellation
	outputCh := make(chan primary.VoteEvent, 10)

	go func() {
		defer close(outputCh)
		defer unsubscribe()

		// Send initial state: vote cast events for participants who have already voted
		for _, vote := range initialVoteStatus {
			if vote.HasVoted {
				select {
				case outputCh <- primary.VoteEvent{
					Type:            primary.VoteEventCast,
					ParticipantID:   vote.ParticipantID,
					ParticipantName: vote.ParticipantName,
				}:
				case <-ctx.Done():
					return
				}
			}
		}

		// If room is revealed, send the summary
		if initialSummary != nil {
			select {
			case outputCh <- primary.VoteEvent{
				Type:    primary.VoteEventRevealed,
				Summary: initialSummary,
			}:
			case <-ctx.Done():
				return
			}
		}

		// Continue with live events
		for {
			select {
			case <-ctx.Done():
				return
			case event, ok := <-eventCh:
				if !ok {
					return
				}
				select {
				case outputCh <- event:
				case <-ctx.Done():
					return
				}
			}
		}
	}()

	return outputCh, nil
}
