package primary

import (
	"context"

	"github.com/vicmanager/esteemed/backend/internal/domain"
)

// RoomService defines the primary port for room operations
type RoomService interface {
	// CreateRoom creates a new room with a generated name
	CreateRoom(ctx context.Context, hostName string) (*CreateRoomResult, error)

	// JoinRoom adds a participant to an existing room
	JoinRoom(ctx context.Context, roomID, participantName, sessionToken string) (*JoinRoomResult, error)

	// LeaveRoom removes a participant from a room
	LeaveRoom(ctx context.Context, roomID, participantID, sessionToken string) error

	// GetRoom returns the current state of a room
	GetRoom(ctx context.Context, roomID string) (*domain.Room, error)

	// WatchRoom returns a channel for room events
	WatchRoom(ctx context.Context, roomID, sessionToken string) (<-chan RoomEvent, error)
}

// CreateRoomResult contains the result of creating a room
type CreateRoomResult struct {
	Room          *domain.Room
	SessionToken  string
	ParticipantID string
}

// JoinRoomResult contains the result of joining a room
type JoinRoomResult struct {
	Room          *domain.Room
	SessionToken  string
	ParticipantID string
}

// RoomEventType represents types of room events
type RoomEventType int

const (
	RoomEventParticipantJoined RoomEventType = iota
	RoomEventParticipantLeft
	RoomEventStateChanged
	RoomEventTopicChanged
	RoomEventClosed
)

// RoomEvent represents a real-time room event
type RoomEvent struct {
	Type          RoomEventType
	Participant   *domain.Participant
	ParticipantID string
	NewState      domain.RoomState
	Topic         string
	Reason        string
}
