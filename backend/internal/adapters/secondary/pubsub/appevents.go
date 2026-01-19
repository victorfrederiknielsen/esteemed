package pubsub

import (
	"context"
	"sync"

	"github.com/vicmanager/esteemed/backend/internal/domain"
)

// AppEventBroker is a channel-based pub/sub implementation for application events
type AppEventBroker struct {
	mu          sync.RWMutex
	subscribers []chan domain.AppEvent
}

// NewAppEventBroker creates a new application event broker
func NewAppEventBroker() *AppEventBroker {
	return &AppEventBroker{
		subscribers: make([]chan domain.AppEvent, 0),
	}
}

// Publish broadcasts an application event to all subscribers
func (b *AppEventBroker) Publish(ctx context.Context, event domain.AppEvent) error {
	b.mu.RLock()
	subs := make([]chan domain.AppEvent, len(b.subscribers))
	copy(subs, b.subscribers)
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

// Subscribe creates a subscription to application events
func (b *AppEventBroker) Subscribe(_ context.Context) (events <-chan domain.AppEvent, unsubscribe func()) {
	ch := make(chan domain.AppEvent, 100) // Larger buffer for app-wide events

	b.mu.Lock()
	b.subscribers = append(b.subscribers, ch)
	b.mu.Unlock()

	unsubscribe = func() {
		b.mu.Lock()
		defer b.mu.Unlock()

		for i, sub := range b.subscribers {
			if sub == ch {
				b.subscribers = append(b.subscribers[:i], b.subscribers[i+1:]...)
				close(ch)
				break
			}
		}
	}

	events = ch
	return
}
