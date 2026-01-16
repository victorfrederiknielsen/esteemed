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
func (s *EstimationService) CastVote(ctx context.Context, roomID, participantID, sessionToken string, value domain.CardValue) error {
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

	if err := s.repo.Save(ctx, room); err != nil {
		return err
	}

	// Publish vote event (without the value - hidden until reveal)
	s.publisher.PublishVoteEvent(ctx, room.ID, primary.VoteEvent{
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

	if err := s.repo.Save(ctx, room); err != nil {
		return nil, err
	}

	// Publish reveal event
	s.publisher.PublishVoteEvent(ctx, room.ID, primary.VoteEvent{
		Type:    primary.VoteEventRevealed,
		Summary: summary,
	})

	// Also publish room state change
	s.publisher.PublishRoomEvent(ctx, room.ID, primary.RoomEvent{
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

	if err := s.repo.Save(ctx, room); err != nil {
		return err
	}

	// Publish reset event
	s.publisher.PublishVoteEvent(ctx, room.ID, primary.VoteEvent{
		Type: primary.VoteEventReset,
	})

	// Also publish room state change
	s.publisher.PublishRoomEvent(ctx, room.ID, primary.RoomEvent{
		Type:     primary.RoomEventStateChanged,
		NewState: domain.RoomStateVoting,
	})

	return nil
}

// SetTopic sets the current estimation topic
func (s *EstimationService) SetTopic(ctx context.Context, roomID, participantID, sessionToken, topic string) error {
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

	// Set topic
	room.SetTopic(topic)

	// Start voting if in waiting state
	startedVoting := false
	if room.GetState() == domain.RoomStateWaiting {
		room.StartVoting()
		startedVoting = true
	}

	if err := s.repo.Save(ctx, room); err != nil {
		return err
	}

	// Publish topic change event
	s.publisher.PublishRoomEvent(ctx, room.ID, primary.RoomEvent{
		Type:  primary.RoomEventTopicChanged,
		Topic: topic,
	})

	// Publish state change if we started voting
	if startedVoting {
		s.publisher.PublishRoomEvent(ctx, room.ID, primary.RoomEvent{
			Type:     primary.RoomEventStateChanged,
			NewState: domain.RoomStateVoting,
		})
	}

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

	// Subscribe to events
	eventCh, unsubscribe := s.publisher.SubscribeVoteEvents(ctx, room.ID)

	// Create output channel that handles context cancellation
	outputCh := make(chan primary.VoteEvent, 10)

	go func() {
		defer close(outputCh)
		defer unsubscribe()

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
