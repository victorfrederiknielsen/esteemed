package secondary

import (
	"context"

	"github.com/vicmanager/esteemed/backend/internal/domain"
)

// AppEventPublisher defines the secondary port for publishing application-wide events
type AppEventPublisher interface {
	// Publish broadcasts an application event to all subscribers
	Publish(ctx context.Context, event domain.AppEvent) error

	// Subscribe creates a subscription to application events
	// Returns a channel to receive events and an unsubscribe function
	Subscribe(ctx context.Context) (<-chan domain.AppEvent, func())
}
