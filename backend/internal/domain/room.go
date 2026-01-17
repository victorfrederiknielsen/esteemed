package domain

import (
	"errors"
	"sync"
	"time"
)

// Errors
var (
	ErrRoomNotFound              = errors.New("room not found")
	ErrParticipantExists         = errors.New("participant already exists")
	ErrParticipantNotFound       = errors.New("participant not found")
	ErrNotHost                   = errors.New("only the host can perform this action")
	ErrInvalidState              = errors.New("invalid room state for this action")
	ErrInvalidToken              = errors.New("invalid session token")
	ErrSpectatorCannotVote       = errors.New("spectators cannot vote")
	ErrCannotKickSelf            = errors.New("cannot kick yourself")
	ErrCannotTransferToSpectator = errors.New("cannot transfer ownership to a spectator")
)

// RoomState represents the current phase of estimation
type RoomState int

// RoomState constants represent the possible phases of a planning poker session.
const (
	RoomStateWaiting RoomState = iota
	RoomStateVoting
	RoomStateRevealed
)

// Room represents a planning poker room
type Room struct {
	mu sync.RWMutex

	ID             string
	Name           string
	Participants   map[string]*Participant
	State          RoomState
	CreatedAt      time.Time
	LastActivityAt time.Time
	Votes          map[string]*Vote
	CardConfig     *CardConfig
}

// Participant in a room
type Participant struct {
	ID           string
	Name         string
	SessionToken string
	IsHost       bool
	IsConnected  bool
	IsSpectator  bool
	JoinedAt     time.Time
}

// NewRoom creates a new room with the given ID, name, host, and optional card config
func NewRoom(id, name string, host *Participant, cardConfig *CardConfig) *Room {
	host.IsHost = true
	now := time.Now()

	if cardConfig == nil {
		cardConfig = DefaultCardConfig()
	}

	return &Room{
		ID:             id,
		Name:           name,
		Participants:   map[string]*Participant{host.ID: host},
		State:          RoomStateWaiting,
		CreatedAt:      now,
		LastActivityAt: now,
		Votes:          make(map[string]*Vote),
		CardConfig:     cardConfig,
	}
}

// TouchActivity updates the last activity timestamp
func (r *Room) TouchActivity() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.LastActivityAt = time.Now()
}

// IsExpired returns true if the room has been inactive longer than the timeout
func (r *Room) IsExpired(timeout time.Duration) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return time.Since(r.LastActivityAt) > timeout
}

// ExpiresAt returns the time when the room will expire based on the timeout
func (r *Room) ExpiresAt(timeout time.Duration) time.Time {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.LastActivityAt.Add(timeout)
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

// RemoveParticipant removes a participant from the room (used for kicks)
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
			// Find earliest connected non-spectator joiner as new host
			var earliestJoiner *Participant
			for _, p := range r.Participants {
				if !p.IsSpectator && p.IsConnected {
					if earliestJoiner == nil || p.JoinedAt.Before(earliestJoiner.JoinedAt) {
						earliestJoiner = p
					}
				}
			}
			if earliestJoiner != nil {
				earliestJoiner.IsHost = true
			}
		}
	}

	return nil
}

// DisconnectParticipant marks a participant as disconnected (used for leave)
// Returns hostTransferred (true if host was transferred) and newHostID
func (r *Room) DisconnectParticipant(participantID string) (hostTransferred bool, newHostID string, err error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	p, exists := r.Participants[participantID]
	if !exists {
		return false, "", ErrParticipantNotFound
	}

	p.IsConnected = false
	wasHost := p.IsHost

	// If host disconnected and there are other connected participants, transfer host
	if wasHost {
		p.IsHost = false
		// Find earliest connected non-spectator joiner as new host
		var earliestJoiner *Participant
		for _, participant := range r.Participants {
			if participant.ID != participantID && !participant.IsSpectator && participant.IsConnected {
				if earliestJoiner == nil || participant.JoinedAt.Before(earliestJoiner.JoinedAt) {
					earliestJoiner = participant
				}
			}
		}
		if earliestJoiner != nil {
			earliestJoiner.IsHost = true
			return true, earliestJoiner.ID, nil
		}
	}

	return false, "", nil
}

// ConnectedParticipantCount returns the number of connected participants
func (r *Room) ConnectedParticipantCount() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	count := 0
	for _, p := range r.Participants {
		if p.IsConnected {
			count++
		}
	}
	return count
}

// HasConnectedParticipants returns true if there are any connected participants
func (r *Room) HasConnectedParticipants() bool {
	return r.ConnectedParticipantCount() > 0
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

// KickParticipant removes a target participant from the room (host action)
func (r *Room) KickParticipant(hostID, targetID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Verify the requester is the host
	host, exists := r.Participants[hostID]
	if !exists {
		return ErrParticipantNotFound
	}
	if !host.IsHost {
		return ErrNotHost
	}

	// Cannot kick yourself
	if hostID == targetID {
		return ErrCannotKickSelf
	}

	// Verify target exists
	if _, exists := r.Participants[targetID]; !exists {
		return ErrParticipantNotFound
	}

	delete(r.Participants, targetID)
	delete(r.Votes, targetID)

	return nil
}

// TransferOwnership transfers host privileges from current host to new participant
func (r *Room) TransferOwnership(currentHostID, newHostID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Verify current host
	currentHost, exists := r.Participants[currentHostID]
	if !exists {
		return ErrParticipantNotFound
	}
	if !currentHost.IsHost {
		return ErrNotHost
	}

	// Verify new host exists and is not a spectator
	newHost, exists := r.Participants[newHostID]
	if !exists {
		return ErrParticipantNotFound
	}
	if newHost.IsSpectator {
		return ErrCannotTransferToSpectator
	}

	// Transfer ownership
	currentHost.IsHost = false
	newHost.IsHost = true

	return nil
}
