package domain

import "time"

// Event types for analytics
const (
	EventTypeRoomCreated  = "room_created"
	EventTypeRoomClosed   = "room_closed"
	EventTypeVoteCast     = "vote_cast"
	EventTypeVoteRevealed = "vote_revealed"
)

// DateRange represents the time period for analytics queries
type DateRange int

const (
	DateRangeUnspecified DateRange = iota
	DateRangeToday
	DateRangeLast7Days
	DateRangeLast30Days
	DateRangeLast90Days
	DateRangeAllTime
)

// Granularity represents the time bucketing for analytics data
type Granularity int

const (
	GranularityUnspecified Granularity = iota
	GranularityHourly
	GranularityDaily
	GranularityWeekly
	GranularityMonthly
)

// GranularityForDateRange returns the appropriate granularity for a date range
func GranularityForDateRange(dr DateRange) Granularity {
	switch dr {
	case DateRangeToday:
		return GranularityHourly
	case DateRangeLast7Days, DateRangeLast30Days:
		return GranularityDaily
	case DateRangeLast90Days:
		return GranularityWeekly
	case DateRangeAllTime:
		return GranularityMonthly
	default:
		return GranularityDaily
	}
}

// TimeRangeForDateRange returns the start and end times for a date range
func TimeRangeForDateRange(dr DateRange, now time.Time) (start, end time.Time) {
	end = now

	switch dr {
	case DateRangeToday:
		start = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	case DateRangeLast7Days:
		start = now.AddDate(0, 0, -7)
	case DateRangeLast30Days:
		start = now.AddDate(0, 0, -30)
	case DateRangeLast90Days:
		start = now.AddDate(0, 0, -90)
	case DateRangeAllTime:
		start = time.Time{} // Zero time for all time
	default:
		start = now.AddDate(0, 0, -7)
	}

	return start, end
}

// AnalyticsEvent represents a tracked event for analytics
type AnalyticsEvent struct {
	ID        int64
	EventType string
	RoomID    string
	Metadata  string // JSON for flexibility
	CreatedAt time.Time
}

// AnalyticsSummary provides aggregate statistics
type AnalyticsSummary struct {
	TotalRooms         int64
	TotalVotes         int64
	TotalReveals       int64
	TotalClosures      int64
	RoomsChangePercent float64
	VotesChangePercent float64
}

// TimeBucket contains aggregated metrics for a specific time interval
type TimeBucket struct {
	Timestamp     time.Time
	Label         string
	RoomsCreated  int64
	VotesCast     int64
	VotesRevealed int64
	RoomsClosed   int64
}

// AnalyticsResult contains the full analytics response
type AnalyticsResult struct {
	Summary     *AnalyticsSummary
	Buckets     []*TimeBucket
	Granularity Granularity
	StartTime   time.Time
	EndTime     time.Time
}

// NewAnalyticsEvent creates a new analytics event
func NewAnalyticsEvent(eventType, roomID, metadata string) *AnalyticsEvent {
	return &AnalyticsEvent{
		EventType: eventType,
		RoomID:    roomID,
		Metadata:  metadata,
		CreatedAt: time.Now(),
	}
}
