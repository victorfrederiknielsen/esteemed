package secondary

import (
	"context"

	"github.com/vicmanager/esteemed/backend/internal/ports/primary"
)

// EventPublisher defines the secondary port for publishing events
type EventPublisher interface {
	// PublishRoomEvent publishes a room event to all subscribers
	PublishRoomEvent(ctx context.Context, roomID string, event primary.RoomEvent) error

	// PublishVoteEvent publishes a vote event to all subscribers
	PublishVoteEvent(ctx context.Context, roomID string, event primary.VoteEvent) error

	// SubscribeRoomEvents subscribes to room events for a specific room
	SubscribeRoomEvents(ctx context.Context, roomID string) (<-chan primary.RoomEvent, func())

	// SubscribeVoteEvents subscribes to vote events for a specific room
	SubscribeVoteEvents(ctx context.Context, roomID string) (<-chan primary.VoteEvent, func())
}
