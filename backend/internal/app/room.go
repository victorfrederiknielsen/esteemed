package app

import (
	"context"
	"time"

	"github.com/vicmanager/esteemed/backend/internal/domain"
	"github.com/vicmanager/esteemed/backend/internal/ports/primary"
	"github.com/vicmanager/esteemed/backend/internal/ports/secondary"
)

// RoomService implements the primary.RoomService interface
type RoomService struct {
	repo      secondary.RoomRepository
	publisher secondary.EventPublisher
}

// NewRoomService creates a new room service
func NewRoomService(repo secondary.RoomRepository, publisher secondary.EventPublisher) *RoomService {
	return &RoomService{
		repo:      repo,
		publisher: publisher,
	}
}

// ListRooms returns all active rooms
func (s *RoomService) ListRooms(ctx context.Context) ([]*primary.RoomSummary, error) {
	rooms, err := s.repo.ListAll(ctx)
	if err != nil {
		return nil, err
	}

	summaries := make([]*primary.RoomSummary, 0, len(rooms))
	for _, room := range rooms {
		summaries = append(summaries, &primary.RoomSummary{
			ID:               room.ID,
			Name:             room.Name,
			ParticipantCount: room.ParticipantCount(),
			State:            room.GetState(),
			CreatedAt:        room.CreatedAt.Unix(),
		})
	}

	return summaries, nil
}

// CreateRoom creates a new room with a generated name
func (s *RoomService) CreateRoom(ctx context.Context, hostName string) (*primary.CreateRoomResult, error) {
	roomID := domain.GenerateID()
	roomName := domain.GenerateRoomName()
	sessionToken := domain.GenerateSessionToken()
	participantID := domain.GenerateID()

	host := &domain.Participant{
		ID:           participantID,
		Name:         hostName,
		SessionToken: sessionToken,
		IsHost:       true,
		IsConnected:  true,
		JoinedAt:     time.Now(),
	}

	room := domain.NewRoom(roomID, roomName, host)

	if err := s.repo.Save(ctx, room); err != nil {
		return nil, err
	}

	return &primary.CreateRoomResult{
		Room:          room,
		SessionToken:  sessionToken,
		ParticipantID: participantID,
	}, nil
}

// JoinRoom adds a participant to an existing room
func (s *RoomService) JoinRoom(ctx context.Context, roomID, participantName, sessionToken string, isSpectator bool) (*primary.JoinRoomResult, error) {
	room, err := s.repo.FindByID(ctx, roomID)
	if err != nil {
		// Try finding by name if ID lookup fails
		room, err = s.repo.FindByName(ctx, roomID)
		if err != nil {
			return nil, err
		}
	}

	// Check for reconnection via session token
	if sessionToken != "" {
		existing, err := room.GetParticipantByToken(sessionToken)
		if err == nil {
			// Reconnecting - update connection status
			existing.IsConnected = true
			if err := s.repo.Save(ctx, room); err != nil {
				return nil, err
			}

			// Publish rejoin event
			s.publisher.PublishRoomEvent(ctx, room.ID, primary.RoomEvent{
				Type:        primary.RoomEventParticipantJoined,
				Participant: existing,
			})

			return &primary.JoinRoomResult{
				Room:          room,
				SessionToken:  sessionToken,
				ParticipantID: existing.ID,
			}, nil
		}
	}

	// New participant
	newToken := domain.GenerateSessionToken()
	participantID := domain.GenerateID()

	participant := &domain.Participant{
		ID:           participantID,
		Name:         participantName,
		SessionToken: newToken,
		IsHost:       false,
		IsConnected:  true,
		IsSpectator:  isSpectator,
		JoinedAt:     time.Now(),
	}

	if err := room.AddParticipant(participant); err != nil {
		return nil, err
	}

	if err := s.repo.Save(ctx, room); err != nil {
		return nil, err
	}

	// Publish join event
	s.publisher.PublishRoomEvent(ctx, room.ID, primary.RoomEvent{
		Type:        primary.RoomEventParticipantJoined,
		Participant: participant,
	})

	return &primary.JoinRoomResult{
		Room:          room,
		SessionToken:  newToken,
		ParticipantID: participantID,
	}, nil
}

// LeaveRoom removes a participant from a room
func (s *RoomService) LeaveRoom(ctx context.Context, roomID, participantID, sessionToken string) error {
	room, err := s.repo.FindByID(ctx, roomID)
	if err != nil {
		return err
	}

	// Validate token
	if err := room.ValidateToken(participantID, sessionToken); err != nil {
		return err
	}

	if err := room.RemoveParticipant(participantID); err != nil {
		return err
	}

	// Check if room is empty
	if room.IsEmpty() {
		// Delete empty room
		s.publisher.PublishRoomEvent(ctx, room.ID, primary.RoomEvent{
			Type:   primary.RoomEventClosed,
			Reason: "all participants left",
		})
		return s.repo.Delete(ctx, room.ID)
	}

	if err := s.repo.Save(ctx, room); err != nil {
		return err
	}

	// Publish leave event
	s.publisher.PublishRoomEvent(ctx, room.ID, primary.RoomEvent{
		Type:          primary.RoomEventParticipantLeft,
		ParticipantID: participantID,
	})

	return nil
}

// GetRoom returns the current state of a room
func (s *RoomService) GetRoom(ctx context.Context, roomID string) (*domain.Room, error) {
	room, err := s.repo.FindByID(ctx, roomID)
	if err != nil {
		// Try finding by name
		room, err = s.repo.FindByName(ctx, roomID)
		if err != nil {
			return nil, err
		}
	}
	return room, nil
}

// WatchRoom returns a channel for room events
func (s *RoomService) WatchRoom(ctx context.Context, roomID, sessionToken string) (<-chan primary.RoomEvent, error) {
	// Verify room exists
	room, err := s.repo.FindByID(ctx, roomID)
	if err != nil {
		room, err = s.repo.FindByName(ctx, roomID)
		if err != nil {
			return nil, err
		}
	}

	// Subscribe to events
	eventCh, unsubscribe := s.publisher.SubscribeRoomEvents(ctx, room.ID)

	// Create output channel that handles context cancellation
	outputCh := make(chan primary.RoomEvent, 10)

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

// KickParticipant removes a target participant from the room (host only)
func (s *RoomService) KickParticipant(ctx context.Context, roomID, participantID, sessionToken, targetParticipantID string) error {
	room, err := s.repo.FindByID(ctx, roomID)
	if err != nil {
		return err
	}

	// Validate token
	if err := room.ValidateToken(participantID, sessionToken); err != nil {
		return err
	}

	// Kick the participant
	if err := room.KickParticipant(participantID, targetParticipantID); err != nil {
		return err
	}

	// Check if room is empty
	if room.IsEmpty() {
		s.publisher.PublishRoomEvent(ctx, room.ID, primary.RoomEvent{
			Type:   primary.RoomEventClosed,
			Reason: "all participants left",
		})
		return s.repo.Delete(ctx, room.ID)
	}

	if err := s.repo.Save(ctx, room); err != nil {
		return err
	}

	// Publish leave event for the kicked participant
	s.publisher.PublishRoomEvent(ctx, room.ID, primary.RoomEvent{
		Type:          primary.RoomEventParticipantLeft,
		ParticipantID: targetParticipantID,
	})

	return nil
}

// TransferOwnership transfers host privileges to another participant
func (s *RoomService) TransferOwnership(ctx context.Context, roomID, participantID, sessionToken, newHostID string) error {
	room, err := s.repo.FindByID(ctx, roomID)
	if err != nil {
		return err
	}

	// Validate token
	if err := room.ValidateToken(participantID, sessionToken); err != nil {
		return err
	}

	// Transfer ownership
	if err := room.TransferOwnership(participantID, newHostID); err != nil {
		return err
	}

	if err := s.repo.Save(ctx, room); err != nil {
		return err
	}

	// Publish host changed event
	s.publisher.PublishRoomEvent(ctx, room.ID, primary.RoomEvent{
		Type:      primary.RoomEventHostChanged,
		NewHostID: newHostID,
	})

	return nil
}
