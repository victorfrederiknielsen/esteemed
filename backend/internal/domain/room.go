package domain

import (
	"errors"
	"sync"
	"time"
)

// Errors
var (
	ErrRoomNotFound        = errors.New("room not found")
	ErrParticipantExists   = errors.New("participant already exists")
	ErrParticipantNotFound = errors.New("participant not found")
	ErrNotHost             = errors.New("only the host can perform this action")
	ErrInvalidState        = errors.New("invalid room state for this action")
	ErrInvalidToken        = errors.New("invalid session token")
)

// RoomState represents the current phase of estimation
type RoomState int

const (
	RoomStateWaiting RoomState = iota
	RoomStateVoting
	RoomStateRevealed
)

// Room represents a planning poker room
type Room struct {
	mu sync.RWMutex

	ID           string
	Name         string
	Participants map[string]*Participant
	State        RoomState
	CreatedAt    time.Time
	Votes        map[string]*Vote
}

// Participant in a room
type Participant struct {
	ID           string
	Name         string
	SessionToken string
	IsHost       bool
	IsConnected  bool
	JoinedAt     time.Time
}

// NewRoom creates a new room with the given ID, name, and host
func NewRoom(id, name string, host *Participant) *Room {
	host.IsHost = true
	return &Room{
		ID:           id,
		Name:         name,
		Participants: map[string]*Participant{host.ID: host},
		State:        RoomStateWaiting,
		CreatedAt:    time.Now(),
		Votes:        make(map[string]*Vote),
	}
}

// AddParticipant adds a new participant to the room
func (r *Room) AddParticipant(p *Participant) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.Participants[p.ID]; exists {
		return ErrParticipantExists
	}

	r.Participants[p.ID] = p
	return nil
}

// RemoveParticipant removes a participant from the room
func (r *Room) RemoveParticipant(participantID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.Participants[participantID]; !exists {
		return ErrParticipantNotFound
	}

	delete(r.Participants, participantID)
	delete(r.Votes, participantID)

	// If host left and there are other participants, assign new host
	if len(r.Participants) > 0 {
		hasHost := false
		for _, p := range r.Participants {
			if p.IsHost {
				hasHost = true
				break
			}
		}
		if !hasHost {
			// Assign first participant as new host
			for _, p := range r.Participants {
				p.IsHost = true
				break
			}
		}
	}

	return nil
}

// GetParticipant returns a participant by ID
func (r *Room) GetParticipant(participantID string) (*Participant, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	p, exists := r.Participants[participantID]
	if !exists {
		return nil, ErrParticipantNotFound
	}
	return p, nil
}

// GetParticipantByToken finds a participant by session token
func (r *Room) GetParticipantByToken(token string) (*Participant, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, p := range r.Participants {
		if p.SessionToken == token {
			return p, nil
		}
	}
	return nil, ErrParticipantNotFound
}

// IsHost checks if a participant is the host
func (r *Room) IsHost(participantID string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	p, exists := r.Participants[participantID]
	return exists && p.IsHost
}

// ValidateToken checks if the token belongs to the participant
func (r *Room) ValidateToken(participantID, token string) error {
	r.mu.RLock()
	defer r.mu.RUnlock()

	p, exists := r.Participants[participantID]
	if !exists {
		return ErrParticipantNotFound
	}
	if p.SessionToken != token {
		return ErrInvalidToken
	}
	return nil
}

// SetState changes the room state
func (r *Room) SetState(state RoomState) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.State = state
}

// GetState returns the current room state
func (r *Room) GetState() RoomState {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.State
}

// ParticipantCount returns the number of participants
func (r *Room) ParticipantCount() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.Participants)
}

// IsEmpty returns true if the room has no participants
func (r *Room) IsEmpty() bool {
	return r.ParticipantCount() == 0
}

// GetParticipants returns a copy of all participants
func (r *Room) GetParticipants() []*Participant {
	r.mu.RLock()
	defer r.mu.RUnlock()

	participants := make([]*Participant, 0, len(r.Participants))
	for _, p := range r.Participants {
		participants = append(participants, p)
	}
	return participants
}
