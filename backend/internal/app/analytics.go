package app

import (
	"context"
	"fmt"
	"time"

	"github.com/vicmanager/esteemed/backend/internal/domain"
	"github.com/vicmanager/esteemed/backend/internal/ports/primary"
	"github.com/vicmanager/esteemed/backend/internal/ports/secondary"
)

// AnalyticsService implements the primary.AnalyticsService interface
type AnalyticsService struct {
	repo secondary.AnalyticsRepository
}

// NewAnalyticsService creates a new analytics service
func NewAnalyticsService(repo secondary.AnalyticsRepository) *AnalyticsService {
	return &AnalyticsService{repo: repo}
}

// GetAnalytics returns aggregated analytics with time buckets for the given date range
func (s *AnalyticsService) GetAnalytics(ctx context.Context, dateRange domain.DateRange) (*domain.AnalyticsResult, error) {
	now := time.Now()
	startTime, endTime := domain.TimeRangeForDateRange(dateRange, now)
	granularity := domain.GranularityForDateRange(dateRange)

	// Get summary for current period
	summary, err := s.repo.GetAggregatedStats(ctx, startTime, endTime)
	if err != nil {
		return nil, fmt.Errorf("failed to get aggregated stats: %w", err)
	}

	// Calculate trend percentages vs previous period
	prevStart, prevEnd := previousPeriod(startTime, endTime, dateRange)
	prevSummary, err := s.repo.GetAggregatedStats(ctx, prevStart, prevEnd)
	if err != nil {
		return nil, fmt.Errorf("failed to get previous period stats: %w", err)
	}

	summary.RoomsChangePercent = calculateChangePercent(prevSummary.TotalRooms, summary.TotalRooms)
	summary.VotesChangePercent = calculateChangePercent(prevSummary.TotalVotes, summary.TotalVotes)

	// Get buckets based on granularity
	var buckets []*domain.TimeBucket
	switch granularity {
	case domain.GranularityHourly:
		buckets, err = s.repo.GetHourlyBuckets(ctx, startTime, endTime)
	case domain.GranularityDaily:
		buckets, err = s.repo.GetDailyBuckets(ctx, startTime, endTime)
	case domain.GranularityWeekly:
		buckets, err = s.repo.GetWeeklyBuckets(ctx, startTime, endTime)
	case domain.GranularityMonthly:
		buckets, err = s.repo.GetMonthlyBuckets(ctx, startTime, endTime)
	default:
		buckets, err = s.repo.GetDailyBuckets(ctx, startTime, endTime)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get buckets: %w", err)
	}

	// Fill in missing buckets with zeros
	buckets = fillMissingBuckets(buckets, startTime, endTime, granularity)

	return &domain.AnalyticsResult{
		Summary:     summary,
		Buckets:     buckets,
		Granularity: granularity,
		StartTime:   startTime,
		EndTime:     endTime,
	}, nil
}

// previousPeriod calculates the previous period of the same duration
func previousPeriod(start, end time.Time, dateRange domain.DateRange) (prevStart, prevEnd time.Time) {
	duration := end.Sub(start)

	switch dateRange {
	case domain.DateRangeAllTime:
		// For all time, we can't really compare to a previous period
		// Just return an empty range (which will result in 0s)
		return time.Time{}, time.Time{}
	default:
		prevEnd = start
		prevStart = prevEnd.Add(-duration)
		return prevStart, prevEnd
	}
}

// calculateChangePercent calculates the percentage change between two values
func calculateChangePercent(previous, current int64) float64 {
	if previous == 0 {
		if current == 0 {
			return 0
		}
		return 100 // 100% increase from 0
	}
	return float64(current-previous) / float64(previous) * 100
}

// fillMissingBuckets fills in missing time buckets with zero values
func fillMissingBuckets(buckets []*domain.TimeBucket, start, end time.Time, granularity domain.Granularity) []*domain.TimeBucket {
	if len(buckets) == 0 {
		return generateEmptyBuckets(start, end, granularity)
	}

	// Create a map of existing buckets by their timestamp key
	// Normalize timestamps to local time and bucket boundary to ensure matching
	bucketMap := make(map[string]*domain.TimeBucket)
	for _, b := range buckets {
		// Convert to local time and normalize to bucket boundary
		localTime := b.Timestamp.Local()
		normalizedTime := normalizeToGranularity(localTime, granularity)
		key := bucketKey(normalizedTime, granularity)
		bucketMap[key] = b
	}

	// Generate all expected buckets and fill in missing ones
	result := generateEmptyBuckets(start, end, granularity)
	for i, b := range result {
		key := bucketKey(b.Timestamp, granularity)
		if existing, ok := bucketMap[key]; ok {
			// Keep the normalized timestamp but copy the data
			result[i].RoomsCreated = existing.RoomsCreated
			result[i].VotesCast = existing.VotesCast
			result[i].VotesRevealed = existing.VotesRevealed
			result[i].RoomsClosed = existing.RoomsClosed
		}
	}

	return result
}

// bucketKey generates a unique key for a bucket based on its timestamp and granularity
func bucketKey(t time.Time, granularity domain.Granularity) string {
	switch granularity {
	case domain.GranularityHourly:
		return t.Format("2006-01-02-15")
	case domain.GranularityDaily:
		return t.Format("2006-01-02")
	case domain.GranularityWeekly:
		year, week := t.ISOWeek()
		return fmt.Sprintf("%d-W%02d", year, week)
	case domain.GranularityMonthly:
		return t.Format("2006-01")
	default:
		return t.Format("2006-01-02")
	}
}

// generateEmptyBuckets creates empty buckets for the given time range
func generateEmptyBuckets(start, end time.Time, granularity domain.Granularity) []*domain.TimeBucket {
	var buckets []*domain.TimeBucket
	current := normalizeToGranularity(start, granularity)

	for !current.After(end) {
		bucket := &domain.TimeBucket{
			Timestamp:     current,
			Label:         formatLabel(current, granularity),
			RoomsCreated:  0,
			VotesCast:     0,
			VotesRevealed: 0,
			RoomsClosed:   0,
		}
		buckets = append(buckets, bucket)
		current = advanceByGranularity(current, granularity)
	}

	return buckets
}

// normalizeToGranularity rounds a timestamp down to the start of its bucket
func normalizeToGranularity(t time.Time, granularity domain.Granularity) time.Time {
	switch granularity {
	case domain.GranularityHourly:
		return time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), 0, 0, 0, t.Location())
	case domain.GranularityDaily:
		return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
	case domain.GranularityWeekly:
		// Round to start of week (Monday)
		weekday := int(t.Weekday())
		if weekday == 0 {
			weekday = 7 // Sunday
		}
		return time.Date(t.Year(), t.Month(), t.Day()-(weekday-1), 0, 0, 0, 0, t.Location())
	case domain.GranularityMonthly:
		return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, t.Location())
	default:
		return t
	}
}

// advanceByGranularity moves to the next bucket
func advanceByGranularity(t time.Time, granularity domain.Granularity) time.Time {
	switch granularity {
	case domain.GranularityHourly:
		return t.Add(time.Hour)
	case domain.GranularityDaily:
		return t.AddDate(0, 0, 1)
	case domain.GranularityWeekly:
		return t.AddDate(0, 0, 7)
	case domain.GranularityMonthly:
		return t.AddDate(0, 1, 0)
	default:
		return t.AddDate(0, 0, 1)
	}
}

// formatLabel generates a human-readable label for a bucket
func formatLabel(t time.Time, granularity domain.Granularity) string {
	switch granularity {
	case domain.GranularityHourly:
		return t.Format("3 PM")
	case domain.GranularityDaily:
		return t.Format("Jan 2")
	case domain.GranularityWeekly:
		_, week := t.ISOWeek()
		return fmt.Sprintf("Week %d", week)
	case domain.GranularityMonthly:
		return t.Format("Jan 2006")
	default:
		return t.Format("Jan 2")
	}
}

// Ensure AnalyticsService implements the interface
var _ primary.AnalyticsService = (*AnalyticsService)(nil)
