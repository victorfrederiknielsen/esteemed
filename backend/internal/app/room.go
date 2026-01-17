package app

import (
	"context"
	"time"

	"github.com/vicmanager/esteemed/backend/internal/domain"
	"github.com/vicmanager/esteemed/backend/internal/ports/primary"
	"github.com/vicmanager/esteemed/backend/internal/ports/secondary"
)

// RoomInactivityTimeout is the duration after which inactive rooms are cleaned up
const RoomInactivityTimeout = 15 * time.Minute

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
			ParticipantCount: room.ConnectedParticipantCount(),
			State:            room.GetState(),
			CreatedAt:        room.CreatedAt.Unix(),
			ExpiresAt:        room.ExpiresAt(RoomInactivityTimeout).Unix(),
		})
	}

	return summaries, nil
}

// CreateRoom creates a new room with a generated name
func (s *RoomService) CreateRoom(ctx context.Context, hostName, sessionToken string) (*primary.CreateRoomResult, error) {
	roomID := domain.GenerateID()
	roomName := domain.GenerateRoomName()
	participantID := domain.GenerateID()

	// Use client-provided session token if available, otherwise generate one
	if sessionToken == "" {
		sessionToken = domain.GenerateSessionToken()
	}

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
			// Reconnecting - update connection status and name if provided
			existing.IsConnected = true
			if participantName != "" {
				existing.Name = participantName
			}
			if err := s.repo.Save(ctx, room); err != nil {
				return nil, err
			}

			// Publish rejoin event
			_ = s.publisher.PublishRoomEvent(ctx, room.ID, primary.RoomEvent{
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

	// New participant - use client-provided token if available
	participantToken := sessionToken
	if participantToken == "" {
		participantToken = domain.GenerateSessionToken()
	}
	participantID := domain.GenerateID()

	participant := &domain.Participant{
		ID:           participantID,
		Name:         participantName,
		SessionToken: participantToken,
		IsHost:       false,
		IsConnected:  true,
		IsSpectator:  isSpectator,
		JoinedAt:     time.Now(),
	}

	if err := room.AddParticipant(participant); err != nil {
		return nil, err
	}

	room.TouchActivity()

	if err := s.repo.Save(ctx, room); err != nil {
		return nil, err
	}

	// Publish join event
	_ = s.publisher.PublishRoomEvent(ctx, room.ID, primary.RoomEvent{
		Type:        primary.RoomEventParticipantJoined,
		Participant: participant,
	})

	return &primary.JoinRoomResult{
		Room:          room,
		SessionToken:  participantToken,
		ParticipantID: participantID,
	}, nil
}

// LeaveRoom marks a participant as disconnected (allows reconnection)
func (s *RoomService) LeaveRoom(ctx context.Context, roomID, participantID, sessionToken string) error {
	room, err := s.repo.FindByID(ctx, roomID)
	if err != nil {
		return err
	}

	// Validate token
	if err := room.ValidateToken(participantID, sessionToken); err != nil {
		return err
	}

	// Mark participant as disconnected (not removed, so they can reconnect)
	hostTransferred, newHostID, err := room.DisconnectParticipant(participantID)
	if err != nil {
		return err
	}

	// Check if all participants are disconnected
	if !room.HasConnectedParticipants() {
		// Delete room when everyone has disconnected
		_ = s.publisher.PublishRoomEvent(ctx, room.ID, primary.RoomEvent{
			Type:   primary.RoomEventClosed,
			Reason: "all participants left",
		})
		return s.repo.Delete(ctx, room.ID)
	}

	room.TouchActivity()

	if err := s.repo.Save(ctx, room); err != nil {
		return err
	}

	// Notify other participants that this person left
	_ = s.publisher.PublishRoomEvent(ctx, room.ID, primary.RoomEvent{
		Type:          primary.RoomEventParticipantLeft,
		ParticipantID: participantID,
	})

	// If host was transferred, publish host changed event
	if hostTransferred && newHostID != "" {
		_ = s.publisher.PublishRoomEvent(ctx, room.ID, primary.RoomEvent{
			Type:      primary.RoomEventHostChanged,
			NewHostID: newHostID,
		})
	}

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
		_ = s.publisher.PublishRoomEvent(ctx, room.ID, primary.RoomEvent{
			Type:   primary.RoomEventClosed,
			Reason: "all participants left",
		})
		return s.repo.Delete(ctx, room.ID)
	}

	room.TouchActivity()

	if err := s.repo.Save(ctx, room); err != nil {
		return err
	}

	// Publish leave event for the kicked participant
	_ = s.publisher.PublishRoomEvent(ctx, room.ID, primary.RoomEvent{
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

	room.TouchActivity()

	if err := s.repo.Save(ctx, room); err != nil {
		return err
	}

	// Publish host changed event
	_ = s.publisher.PublishRoomEvent(ctx, room.ID, primary.RoomEvent{
		Type:      primary.RoomEventHostChanged,
		NewHostID: newHostID,
	})

	return nil
}
