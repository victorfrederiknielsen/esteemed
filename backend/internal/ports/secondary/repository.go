package secondary

import (
	"context"

	"github.com/vicmanager/esteemed/backend/internal/domain"
)

// RoomRepository defines the secondary port for room persistence
type RoomRepository interface {
	// Save persists a room
	Save(ctx context.Context, room *domain.Room) error

	// FindByID retrieves a room by its ID
	FindByID(ctx context.Context, id string) (*domain.Room, error)

	// FindByName retrieves a room by its name
	FindByName(ctx context.Context, name string) (*domain.Room, error)

	// Delete removes a room
	Delete(ctx context.Context, id string) error

	// Exists checks if a room exists
	Exists(ctx context.Context, id string) (bool, error)
}
