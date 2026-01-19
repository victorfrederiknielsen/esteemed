package domain

import (
	"time"
)

// AppEventType represents the type of application-wide event
type AppEventType int

const (
	AppEventTypeRoomCreated AppEventType = iota + 1
	AppEventTypeRoomClosed
	AppEventTypeVoteCast
	AppEventTypeVoteRevealed
)

// AppEvent represents an application-wide event
type AppEvent struct {
	Type      AppEventType
	Timestamp time.Time
	RoomID    string
	RoomName  string

	// Payload fields (only one is populated based on Type)
	RoomCreated  *RoomCreatedPayload
	RoomClosed   *RoomClosedPayload
	VoteCast     *VoteCastPayload
	VoteRevealed *VoteRevealedPayload
}

// RoomCreatedPayload contains details about a room creation event
type RoomCreatedPayload struct {
	HostName string
}

// RoomClosedPayload contains details about a room closure event
type RoomClosedPayload struct {
	Reason string
}

// VoteCastPayload contains details about a vote being cast
type VoteCastPayload struct {
	ParticipantName string
	VotesInRound    int
}

// VoteRevealedPayload contains details about votes being revealed
type VoteRevealedPayload struct {
	VoteCount int
	Consensus bool
	Average   string
}

// NewRoomCreatedEvent creates a new room created event
func NewRoomCreatedEvent(roomID, roomName, hostName string) AppEvent {
	return AppEvent{
		Type:      AppEventTypeRoomCreated,
		Timestamp: time.Now(),
		RoomID:    roomID,
		RoomName:  roomName,
		RoomCreated: &RoomCreatedPayload{
			HostName: hostName,
		},
	}
}

// NewRoomClosedEvent creates a new room closed event
func NewRoomClosedEvent(roomID, roomName, reason string) AppEvent {
	return AppEvent{
		Type:      AppEventTypeRoomClosed,
		Timestamp: time.Now(),
		RoomID:    roomID,
		RoomName:  roomName,
		RoomClosed: &RoomClosedPayload{
			Reason: reason,
		},
	}
}

// NewVoteCastEvent creates a new vote cast event
func NewVoteCastEvent(roomID, roomName, participantName string, votesInRound int) AppEvent {
	return AppEvent{
		Type:      AppEventTypeVoteCast,
		Timestamp: time.Now(),
		RoomID:    roomID,
		RoomName:  roomName,
		VoteCast: &VoteCastPayload{
			ParticipantName: participantName,
			VotesInRound:    votesInRound,
		},
	}
}

// NewVoteRevealedEvent creates a new vote revealed event
func NewVoteRevealedEvent(roomID, roomName string, voteCount int, consensus bool, average string) AppEvent {
	return AppEvent{
		Type:      AppEventTypeVoteRevealed,
		Timestamp: time.Now(),
		RoomID:    roomID,
		RoomName:  roomName,
		VoteRevealed: &VoteRevealedPayload{
			VoteCount: voteCount,
			Consensus: consensus,
			Average:   average,
		},
	}
}
