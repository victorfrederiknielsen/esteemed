package app

import (
	"context"
	"log"
	"time"

	"github.com/vicmanager/esteemed/backend/internal/ports/primary"
	"github.com/vicmanager/esteemed/backend/internal/ports/secondary"
)

// RoomCleaner periodically removes inactive rooms
type RoomCleaner struct {
	repo      secondary.RoomRepository
	publisher secondary.EventPublisher
	timeout   time.Duration
	interval  time.Duration
}

// NewRoomCleaner creates a new room cleaner
func NewRoomCleaner(repo secondary.RoomRepository, publisher secondary.EventPublisher) *RoomCleaner {
	return &RoomCleaner{
		repo:      repo,
		publisher: publisher,
		timeout:   RoomInactivityTimeout,
		interval:  1 * time.Minute,
	}
}

// Start begins the cleanup goroutine
func (c *RoomCleaner) Start(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(c.interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				c.cleanupExpiredRooms(ctx)
			}
		}
	}()
}

// cleanupExpiredRooms removes all rooms that have been inactive for longer than the timeout
func (c *RoomCleaner) cleanupExpiredRooms(ctx context.Context) {
	rooms, err := c.repo.ListAll(ctx)
	if err != nil {
		log.Printf("RoomCleaner: failed to list rooms: %v", err)
		return
	}

	for _, room := range rooms {
		if room.IsExpired(c.timeout) {
			// Notify connected clients before deletion
			if err := c.publisher.PublishRoomEvent(ctx, room.ID, primary.RoomEvent{
				Type:   primary.RoomEventClosed,
				Reason: "inactivity timeout",
			}); err != nil {
				log.Printf("RoomCleaner: failed to publish room closed event for %s: %v", room.ID, err)
			}

			if err := c.repo.Delete(ctx, room.ID); err != nil {
				log.Printf("RoomCleaner: failed to delete room %s: %v", room.ID, err)
			} else {
				log.Printf("RoomCleaner: deleted inactive room %s (%s)", room.ID, room.Name)
			}
		}
	}
}
