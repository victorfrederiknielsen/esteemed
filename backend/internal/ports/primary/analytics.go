package primary

import (
	"context"

	"github.com/vicmanager/esteemed/backend/internal/domain"
)

// AnalyticsService defines the primary port for analytics operations
type AnalyticsService interface {
	// GetAnalytics returns aggregated analytics with time buckets for the given date range
	GetAnalytics(ctx context.Context, dateRange domain.DateRange) (*domain.AnalyticsResult, error)
}
