package domain

import (
	"sort"
)

// Vote represents a participant's vote
type Vote struct {
	ParticipantID   string
	ParticipantName string
	Value           string
	HasVoted        bool
}

// VoteSummary shows statistics after reveal
type VoteSummary struct {
	Votes          []*Vote
	Average        string  // Rounded to nearest card value
	Mode           string  // Most common vote
	HasConsensus   bool    // All votes are the same
	NumericAverage float64 // Raw numeric average (for display)
}

// CastVote records a participant's vote in the room
func (r *Room) CastVote(participantID, value string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	p, exists := r.Participants[participantID]
	if !exists {
		return ErrParticipantNotFound
	}

	if p.IsSpectator {
		return ErrSpectatorCannotVote
	}

	if r.State != RoomStateVoting {
		return ErrInvalidState
	}

	// Validate the card value against room's card config
	if err := ValidateCardValue(r.CardConfig, value); err != nil {
		return err
	}

	r.Votes[participantID] = &Vote{
		ParticipantID:   participantID,
		ParticipantName: p.Name,
		Value:           value,
		HasVoted:        true,
	}

	return nil
}

// HasVoted checks if a participant has voted
func (r *Room) HasVoted(participantID string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	vote, exists := r.Votes[participantID]
	return exists && vote.HasVoted
}

// GetVoteStatus returns which participants have voted (without revealing values)
// Spectators are excluded from the vote status list
func (r *Room) GetVoteStatus() []*Vote {
	r.mu.RLock()
	defer r.mu.RUnlock()

	status := make([]*Vote, 0, len(r.Participants))
	for _, p := range r.Participants {
		// Skip spectators - they don't vote
		if p.IsSpectator {
			continue
		}
		_, hasVoted := r.Votes[p.ID]
		if hasVoted {
			// Only include that they voted, not the value
			status = append(status, &Vote{
				ParticipantID:   p.ID,
				ParticipantName: p.Name,
				HasVoted:        true,
			})
		} else {
			status = append(status, &Vote{
				ParticipantID:   p.ID,
				ParticipantName: p.Name,
				HasVoted:        false,
			})
		}
	}
	return status
}

// RevealVotes reveals all votes and calculates statistics
func (r *Room) RevealVotes() (*VoteSummary, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.State != RoomStateVoting {
		return nil, ErrInvalidState
	}

	r.State = RoomStateRevealed

	votes := make([]*Vote, 0, len(r.Votes))
	for _, v := range r.Votes {
		votes = append(votes, v)
	}

	// Calculate statistics using the room's card config
	numericAvg, hasNumeric := CalculateNumericAverage(r.CardConfig, votes)

	var avgValue string
	if hasNumeric {
		nearestCard := FindNearestCard(r.CardConfig, numericAvg)
		if nearestCard != nil {
			avgValue = nearestCard.Value
		}
	}

	summary := &VoteSummary{
		Votes:          votes,
		Average:        avgValue,
		Mode:           CalculateModeValue(votes),
		HasConsensus:   CheckConsensus(votes),
		NumericAverage: numericAvg,
	}

	return summary, nil
}

// GetVoteSummary returns the vote summary (only after reveal)
func (r *Room) GetVoteSummary() (*VoteSummary, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if r.State != RoomStateRevealed {
		return nil, ErrInvalidState
	}

	votes := make([]*Vote, 0, len(r.Votes))
	for _, v := range r.Votes {
		votes = append(votes, v)
	}

	numericAvg, hasNumeric := CalculateNumericAverage(r.CardConfig, votes)

	var avgValue string
	if hasNumeric {
		nearestCard := FindNearestCard(r.CardConfig, numericAvg)
		if nearestCard != nil {
			avgValue = nearestCard.Value
		}
	}

	return &VoteSummary{
		Votes:          votes,
		Average:        avgValue,
		Mode:           CalculateModeValue(votes),
		HasConsensus:   CheckConsensus(votes),
		NumericAverage: numericAvg,
	}, nil
}

// ResetRound clears all votes and starts a new voting round
func (r *Room) ResetRound() {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.Votes = make(map[string]*Vote)
	r.State = RoomStateVoting
}

// StartVoting transitions the room to voting state
func (r *Room) StartVoting() {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.State = RoomStateVoting
}

// GetVotes returns all votes (for internal use only)
func (r *Room) GetVotes() []*Vote {
	r.mu.RLock()
	defer r.mu.RUnlock()

	votes := make([]*Vote, 0, len(r.Votes))
	for _, v := range r.Votes {
		votes = append(votes, v)
	}

	sort.Slice(votes, func(i, j int) bool {
		return votes[i].ParticipantName < votes[j].ParticipantName
	})

	return votes
}
