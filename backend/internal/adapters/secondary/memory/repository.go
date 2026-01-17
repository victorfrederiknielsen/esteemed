package memory

import (
	"context"
	"sync"

	"github.com/vicmanager/esteemed/backend/internal/domain"
)

// RoomRepository is an in-memory implementation of the RoomRepository port
type RoomRepository struct {
	mu     sync.RWMutex
	rooms  map[string]*domain.Room
	byName map[string]string // name -> id mapping
}

// NewRoomRepository creates a new in-memory room repository
func NewRoomRepository() *RoomRepository {
	return &RoomRepository{
		rooms:  make(map[string]*domain.Room),
		byName: make(map[string]string),
	}
}

// Save persists a room
func (r *RoomRepository) Save(ctx context.Context, room *domain.Room) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.rooms[room.ID] = room
	r.byName[room.Name] = room.ID
	return nil
}

// FindByID retrieves a room by its ID
func (r *RoomRepository) FindByID(ctx context.Context, id string) (*domain.Room, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	room, exists := r.rooms[id]
	if !exists {
		return nil, domain.ErrRoomNotFound
	}
	return room, nil
}

// FindByName retrieves a room by its name
func (r *RoomRepository) FindByName(ctx context.Context, name string) (*domain.Room, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	id, exists := r.byName[name]
	if !exists {
		return nil, domain.ErrRoomNotFound
	}

	room, exists := r.rooms[id]
	if !exists {
		return nil, domain.ErrRoomNotFound
	}
	return room, nil
}

// Delete removes a room
func (r *RoomRepository) Delete(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	room, exists := r.rooms[id]
	if !exists {
		return domain.ErrRoomNotFound
	}

	delete(r.byName, room.Name)
	delete(r.rooms, id)
	return nil
}

// Exists checks if a room exists
func (r *RoomRepository) Exists(ctx context.Context, id string) (bool, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	_, exists := r.rooms[id]
	return exists, nil
}

// Count returns the number of rooms (for debugging/testing)
func (r *RoomRepository) Count() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.rooms)
}

// ListAll returns all rooms
func (r *RoomRepository) ListAll(ctx context.Context) ([]*domain.Room, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	rooms := make([]*domain.Room, 0, len(r.rooms))
	for _, room := range r.rooms {
		rooms = append(rooms, room)
	}
	return rooms, nil
}
