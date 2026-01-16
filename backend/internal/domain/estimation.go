package domain

import (
	"math"
	"sort"
)

// CardValue represents a planning poker card
type CardValue int

const (
	CardValueUnspecified CardValue = iota
	CardValueOne
	CardValueTwo
	CardValueThree
	CardValueFive
	CardValueEight
	CardValueThirteen
	CardValueTwentyOne
	CardValueQuestion
	CardValueCoffee
)

// NumericValue returns the numeric value for averaging (excludes ? and coffee)
func (c CardValue) NumericValue() (int, bool) {
	switch c {
	case CardValueOne:
		return 1, true
	case CardValueTwo:
		return 2, true
	case CardValueThree:
		return 3, true
	case CardValueFive:
		return 5, true
	case CardValueEight:
		return 8, true
	case CardValueThirteen:
		return 13, true
	case CardValueTwentyOne:
		return 21, true
	default:
		return 0, false
	}
}

// String returns the display string for a card value
func (c CardValue) String() string {
	switch c {
	case CardValueOne:
		return "1"
	case CardValueTwo:
		return "2"
	case CardValueThree:
		return "3"
	case CardValueFive:
		return "5"
	case CardValueEight:
		return "8"
	case CardValueThirteen:
		return "13"
	case CardValueTwentyOne:
		return "21"
	case CardValueQuestion:
		return "?"
	case CardValueCoffee:
		return "☕"
	default:
		return ""
	}
}

// AllCardValues returns all valid card values for the deck
func AllCardValues() []CardValue {
	return []CardValue{
		CardValueOne,
		CardValueTwo,
		CardValueThree,
		CardValueFive,
		CardValueEight,
		CardValueThirteen,
		CardValueTwentyOne,
		CardValueQuestion,
		CardValueCoffee,
	}
}

// Vote represents a participant's vote
type Vote struct {
	ParticipantID   string
	ParticipantName string
	Value           CardValue
	HasVoted        bool
}

// VoteSummary shows statistics after reveal
type VoteSummary struct {
	Votes        []*Vote
	Average      CardValue
	Mode         CardValue
	HasConsensus bool
}

// CastVote records a participant's vote in the room
func (r *Room) CastVote(participantID string, value CardValue) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	p, exists := r.Participants[participantID]
	if !exists {
		return ErrParticipantNotFound
	}

	if r.State != RoomStateVoting {
		return ErrInvalidState
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
func (r *Room) GetVoteStatus() []*Vote {
	r.mu.RLock()
	defer r.mu.RUnlock()

	status := make([]*Vote, 0, len(r.Participants))
	for _, p := range r.Participants {
		vote, hasVoted := r.Votes[p.ID]
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

	summary := &VoteSummary{
		Votes:        votes,
		Average:      calculateAverage(votes),
		Mode:         calculateMode(votes),
		HasConsensus: checkConsensus(votes),
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

	return &VoteSummary{
		Votes:        votes,
		Average:      calculateAverage(votes),
		Mode:         calculateMode(votes),
		HasConsensus: checkConsensus(votes),
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

// calculateAverage calculates the average vote rounded to nearest card
func calculateAverage(votes []*Vote) CardValue {
	var sum, count float64
	for _, v := range votes {
		if num, ok := v.Value.NumericValue(); ok {
			sum += float64(num)
			count++
		}
	}

	if count == 0 {
		return CardValueUnspecified
	}

	avg := sum / count
	return nearestCardValue(avg)
}

// nearestCardValue finds the closest Fibonacci card value
func nearestCardValue(avg float64) CardValue {
	fibValues := []struct {
		card CardValue
		val  int
	}{
		{CardValueOne, 1},
		{CardValueTwo, 2},
		{CardValueThree, 3},
		{CardValueFive, 5},
		{CardValueEight, 8},
		{CardValueThirteen, 13},
		{CardValueTwentyOne, 21},
	}

	closest := fibValues[0]
	minDiff := math.Abs(avg - float64(closest.val))

	for _, fv := range fibValues[1:] {
		diff := math.Abs(avg - float64(fv.val))
		if diff < minDiff {
			minDiff = diff
			closest = fv
		}
	}

	return closest.card
}

// calculateMode finds the most common vote
func calculateMode(votes []*Vote) CardValue {
	if len(votes) == 0 {
		return CardValueUnspecified
	}

	counts := make(map[CardValue]int)
	for _, v := range votes {
		counts[v.Value]++
	}

	var mode CardValue
	maxCount := 0
	for card, count := range counts {
		if count > maxCount {
			maxCount = count
			mode = card
		}
	}

	return mode
}

// checkConsensus returns true if all votes are the same
func checkConsensus(votes []*Vote) bool {
	if len(votes) < 2 {
		return len(votes) == 1
	}

	// Get numeric votes only for consensus check
	var numericVotes []CardValue
	for _, v := range votes {
		if _, ok := v.Value.NumericValue(); ok {
			numericVotes = append(numericVotes, v.Value)
		}
	}

	if len(numericVotes) < 2 {
		return false
	}

	first := numericVotes[0]
	for _, v := range numericVotes[1:] {
		if v != first {
			return false
		}
	}

	return true
}

// VoteCount returns how many participants have voted
func (r *Room) VoteCount() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.Votes)
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
