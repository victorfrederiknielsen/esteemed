package primary

import (
	"context"

	"github.com/vicmanager/esteemed/backend/internal/domain"
)

// RoomService defines the primary port for room operations
type RoomService interface {
	// ListRooms returns all active rooms
	ListRooms(ctx context.Context) ([]*RoomSummary, error)

	// CreateRoom creates a new room with a generated name
	CreateRoom(ctx context.Context, hostName string) (*CreateRoomResult, error)

	// JoinRoom adds a participant to an existing room
	JoinRoom(ctx context.Context, roomID, participantName, sessionToken string, isSpectator bool) (*JoinRoomResult, error)

	// LeaveRoom removes a participant from a room
	LeaveRoom(ctx context.Context, roomID, participantID, sessionToken string) error

	// GetRoom returns the current state of a room
	GetRoom(ctx context.Context, roomID string) (*domain.Room, error)

	// WatchRoom returns a channel for room events
	WatchRoom(ctx context.Context, roomID, sessionToken string) (<-chan RoomEvent, error)

	// KickParticipant removes a target participant from the room (host only)
	KickParticipant(ctx context.Context, roomID, participantID, sessionToken, targetParticipantID string) error

	// TransferOwnership transfers host privileges to another participant
	TransferOwnership(ctx context.Context, roomID, participantID, sessionToken, newHostID string) error
}

// RoomSummary is a brief view of a room for listing
type RoomSummary struct {
	ID               string
	Name             string
	ParticipantCount int
	State            domain.RoomState
	CreatedAt        int64
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
	RoomEventClosed
	RoomEventHostChanged
)

// RoomEvent represents a real-time room event
type RoomEvent struct {
	Type          RoomEventType
	Participant   *domain.Participant
	ParticipantID string
	NewState      domain.RoomState
	Reason        string
	NewHostID     string
}
