package secondary

import (
	"context"
	"time"

	"github.com/vicmanager/esteemed/backend/internal/domain"
)

// AnalyticsRepository defines the secondary port for analytics persistence
type AnalyticsRepository interface {
	// RecordEvent persists an analytics event
	RecordEvent(ctx context.Context, event *domain.AnalyticsEvent) error

	// GetSummary returns aggregate analytics statistics
	GetSummary(ctx context.Context) (*domain.AnalyticsSummary, error)

	// GetEventsInRange returns events within a time range
	GetEventsInRange(ctx context.Context, from, to time.Time) ([]*domain.AnalyticsEvent, error)

	// GetAggregatedStats returns summary statistics for a time period
	GetAggregatedStats(ctx context.Context, from, to time.Time) (*domain.AnalyticsSummary, error)

	// GetHourlyBuckets returns events aggregated by hour
	GetHourlyBuckets(ctx context.Context, from, to time.Time) ([]*domain.TimeBucket, error)

	// GetDailyBuckets returns events aggregated by day
	GetDailyBuckets(ctx context.Context, from, to time.Time) ([]*domain.TimeBucket, error)

	// GetWeeklyBuckets returns events aggregated by week
	GetWeeklyBuckets(ctx context.Context, from, to time.Time) ([]*domain.TimeBucket, error)

	// GetMonthlyBuckets returns events aggregated by month
	GetMonthlyBuckets(ctx context.Context, from, to time.Time) ([]*domain.TimeBucket, error)

	// Close closes the repository connection
	Close() error
}
