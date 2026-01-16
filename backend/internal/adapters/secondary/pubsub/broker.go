package pubsub

import (
	"context"
	"sync"

	"github.com/vicmanager/esteemed/backend/internal/ports/primary"
)

// Broker is a channel-based pub/sub implementation
type Broker struct {
	mu sync.RWMutex

	// Room event subscribers: roomID -> slice of channels
	roomSubs map[string][]chan primary.RoomEvent

	// Vote event subscribers: roomID -> slice of channels
	voteSubs map[string][]chan primary.VoteEvent
}

// NewBroker creates a new pub/sub broker
func NewBroker() *Broker {
	return &Broker{
		roomSubs: make(map[string][]chan primary.RoomEvent),
		voteSubs: make(map[string][]chan primary.VoteEvent),
	}
}

// PublishRoomEvent publishes a room event to all subscribers
func (b *Broker) PublishRoomEvent(ctx context.Context, roomID string, event primary.RoomEvent) error {
	b.mu.RLock()
	subs := b.roomSubs[roomID]
	b.mu.RUnlock()

	for _, ch := range subs {
		select {
		case ch <- event:
		case <-ctx.Done():
			return ctx.Err()
		default:
			// Channel full, skip this subscriber (they'll catch up)
		}
	}
	return nil
}

// PublishVoteEvent publishes a vote event to all subscribers
func (b *Broker) PublishVoteEvent(ctx context.Context, roomID string, event primary.VoteEvent) error {
	b.mu.RLock()
	subs := b.voteSubs[roomID]
	b.mu.RUnlock()

	for _, ch := range subs {
		select {
		case ch <- event:
		case <-ctx.Done():
			return ctx.Err()
		default:
			// Channel full, skip this subscriber
		}
	}
	return nil
}

// SubscribeRoomEvents subscribes to room events for a specific room
func (b *Broker) SubscribeRoomEvents(ctx context.Context, roomID string) (<-chan primary.RoomEvent, func()) {
	ch := make(chan primary.RoomEvent, 10) // Buffer to prevent blocking

	b.mu.Lock()
	b.roomSubs[roomID] = append(b.roomSubs[roomID], ch)
	b.mu.Unlock()

	// Return unsubscribe function
	unsubscribe := func() {
		b.mu.Lock()
		defer b.mu.Unlock()

		subs := b.roomSubs[roomID]
		for i, sub := range subs {
			if sub == ch {
				b.roomSubs[roomID] = append(subs[:i], subs[i+1:]...)
				close(ch)
				break
			}
		}

		// Clean up empty subscription lists
		if len(b.roomSubs[roomID]) == 0 {
			delete(b.roomSubs, roomID)
		}
	}

	return ch, unsubscribe
}

// SubscribeVoteEvents subscribes to vote events for a specific room
func (b *Broker) SubscribeVoteEvents(ctx context.Context, roomID string) (<-chan primary.VoteEvent, func()) {
	ch := make(chan primary.VoteEvent, 10) // Buffer to prevent blocking

	b.mu.Lock()
	b.voteSubs[roomID] = append(b.voteSubs[roomID], ch)
	b.mu.Unlock()

	// Return unsubscribe function
	unsubscribe := func() {
		b.mu.Lock()
		defer b.mu.Unlock()

		subs := b.voteSubs[roomID]
		for i, sub := range subs {
			if sub == ch {
				b.voteSubs[roomID] = append(subs[:i], subs[i+1:]...)
				close(ch)
				break
			}
		}

		// Clean up empty subscription lists
		if len(b.voteSubs[roomID]) == 0 {
			delete(b.voteSubs, roomID)
		}
	}

	return ch, unsubscribe
}

// CleanupRoom removes all subscriptions for a room
func (b *Broker) CleanupRoom(roomID string) {
	b.mu.Lock()
	defer b.mu.Unlock()

	// Close and remove all room event channels
	for _, ch := range b.roomSubs[roomID] {
		close(ch)
	}
	delete(b.roomSubs, roomID)

	// Close and remove all vote event channels
	for _, ch := range b.voteSubs[roomID] {
		close(ch)
	}
	delete(b.voteSubs, roomID)
}

// Stats returns subscription statistics (for debugging)
func (b *Broker) Stats() (roomSubs, voteSubs int) {
	b.mu.RLock()
	defer b.mu.RUnlock()

	for _, subs := range b.roomSubs {
		roomSubs += len(subs)
	}
	for _, subs := range b.voteSubs {
		voteSubs += len(subs)
	}
	return
}
