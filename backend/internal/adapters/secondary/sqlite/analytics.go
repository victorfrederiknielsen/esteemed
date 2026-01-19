package sqlite

import (
	"context"
	"database/sql"
	"time"

	_ "modernc.org/sqlite" // Pure Go SQLite driver

	"github.com/vicmanager/esteemed/backend/internal/domain"
	"github.com/vicmanager/esteemed/backend/internal/ports/secondary"
)

// sqliteTimeFormat is the format SQLite uses for DATETIME columns
const sqliteTimeFormat = "2006-01-02 15:04:05"

// AnalyticsRepository implements secondary.AnalyticsRepository using SQLite
type AnalyticsRepository struct {
	db *sql.DB
}

// NewAnalyticsRepository creates a new SQLite-backed analytics repository
func NewAnalyticsRepository(dbPath string) (*AnalyticsRepository, error) {
	db, err := sql.Open("sqlite", dbPath+"?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)")
	if err != nil {
		return nil, err
	}

	// Set connection pool settings for better concurrent performance
	db.SetMaxOpenConns(1) // SQLite performs best with single writer
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(0) // Connections don't expire

	repo := &AnalyticsRepository{db: db}

	if err := repo.initSchema(); err != nil {
		db.Close()
		return nil, err
	}

	return repo, nil
}

// initSchema creates the necessary tables if they don't exist
func (r *AnalyticsRepository) initSchema() error {
	schema := `
		CREATE TABLE IF NOT EXISTS analytics_events (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			event_type TEXT NOT NULL,
			room_id TEXT,
			metadata TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);

		CREATE INDEX IF NOT EXISTS idx_events_type ON analytics_events(event_type);
		CREATE INDEX IF NOT EXISTS idx_events_created ON analytics_events(created_at);
	`
	_, err := r.db.Exec(schema)
	return err
}

// RecordEvent persists an analytics event
func (r *AnalyticsRepository) RecordEvent(ctx context.Context, event *domain.AnalyticsEvent) error {
	query := `INSERT INTO analytics_events (event_type, room_id, metadata, created_at) VALUES (?, ?, ?, ?)`
	// Format time as SQLite-compatible string for consistent comparisons
	createdAt := event.CreatedAt.UTC().Format(sqliteTimeFormat)
	_, err := r.db.ExecContext(ctx, query, event.EventType, event.RoomID, event.Metadata, createdAt)
	return err
}

// GetSummary returns aggregate analytics statistics (all time)
func (r *AnalyticsRepository) GetSummary(ctx context.Context) (*domain.AnalyticsSummary, error) {
	summary := &domain.AnalyticsSummary{}

	// Get total rooms created
	row := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM analytics_events WHERE event_type = ?`, domain.EventTypeRoomCreated)
	if err := row.Scan(&summary.TotalRooms); err != nil {
		return nil, err
	}

	// Get total votes cast
	row = r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM analytics_events WHERE event_type = ?`, domain.EventTypeVoteCast)
	if err := row.Scan(&summary.TotalVotes); err != nil {
		return nil, err
	}

	// Get total reveals
	row = r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM analytics_events WHERE event_type = ?`, domain.EventTypeVoteRevealed)
	if err := row.Scan(&summary.TotalReveals); err != nil {
		return nil, err
	}

	// Get total closures
	row = r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM analytics_events WHERE event_type = ?`, domain.EventTypeRoomClosed)
	if err := row.Scan(&summary.TotalClosures); err != nil {
		return nil, err
	}

	return summary, nil
}

// GetEventsInRange returns events within a time range
func (r *AnalyticsRepository) GetEventsInRange(ctx context.Context, from, to time.Time) ([]*domain.AnalyticsEvent, error) {
	query := `SELECT id, event_type, room_id, metadata, created_at FROM analytics_events WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC`
	rows, err := r.db.QueryContext(ctx, query, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*domain.AnalyticsEvent
	for rows.Next() {
		event := &domain.AnalyticsEvent{}
		var roomID sql.NullString
		var metadata sql.NullString

		if err := rows.Scan(&event.ID, &event.EventType, &roomID, &metadata, &event.CreatedAt); err != nil {
			return nil, err
		}

		if roomID.Valid {
			event.RoomID = roomID.String
		}
		if metadata.Valid {
			event.Metadata = metadata.String
		}

		events = append(events, event)
	}

	return events, rows.Err()
}

// Close closes the database connection
func (r *AnalyticsRepository) Close() error {
	return r.db.Close()
}

// GetAggregatedStats returns summary statistics for a time period
func (r *AnalyticsRepository) GetAggregatedStats(ctx context.Context, from, to time.Time) (*domain.AnalyticsSummary, error) {
	summary := &domain.AnalyticsSummary{}

	// Build the WHERE clause based on whether we have a start time
	// Format times as SQLite-compatible strings for proper comparison
	var whereClause string
	var args []any
	if from.IsZero() {
		whereClause = "created_at <= ?"
		args = []any{to.UTC().Format(sqliteTimeFormat)}
	} else {
		whereClause = "created_at >= ? AND created_at <= ?"
		args = []any{from.UTC().Format(sqliteTimeFormat), to.UTC().Format(sqliteTimeFormat)}
	}

	// Get total rooms created
	query := "SELECT COUNT(*) FROM analytics_events WHERE event_type = ? AND " + whereClause
	queryArgs := append([]any{domain.EventTypeRoomCreated}, args...)
	row := r.db.QueryRowContext(ctx, query, queryArgs...)
	if err := row.Scan(&summary.TotalRooms); err != nil {
		return nil, err
	}

	// Get total votes cast
	queryArgs = append([]any{domain.EventTypeVoteCast}, args...)
	row = r.db.QueryRowContext(ctx, query, queryArgs...)
	if err := row.Scan(&summary.TotalVotes); err != nil {
		return nil, err
	}

	// Get total reveals
	queryArgs = append([]any{domain.EventTypeVoteRevealed}, args...)
	row = r.db.QueryRowContext(ctx, query, queryArgs...)
	if err := row.Scan(&summary.TotalReveals); err != nil {
		return nil, err
	}

	// Get total closures
	queryArgs = append([]any{domain.EventTypeRoomClosed}, args...)
	row = r.db.QueryRowContext(ctx, query, queryArgs...)
	if err := row.Scan(&summary.TotalClosures); err != nil {
		return nil, err
	}

	return summary, nil
}

// GetHourlyBuckets returns events aggregated by hour
func (r *AnalyticsRepository) GetHourlyBuckets(ctx context.Context, from, to time.Time) ([]*domain.TimeBucket, error) {
	return r.getBuckets(ctx, from, to, "%Y-%m-%d %H:00:00", "hourly")
}

// GetDailyBuckets returns events aggregated by day
func (r *AnalyticsRepository) GetDailyBuckets(ctx context.Context, from, to time.Time) ([]*domain.TimeBucket, error) {
	return r.getBuckets(ctx, from, to, "%Y-%m-%d", "daily")
}

// GetWeeklyBuckets returns events aggregated by week
func (r *AnalyticsRepository) GetWeeklyBuckets(ctx context.Context, from, to time.Time) ([]*domain.TimeBucket, error) {
	return r.getBuckets(ctx, from, to, "%Y-W%W", "weekly")
}

// GetMonthlyBuckets returns events aggregated by month
func (r *AnalyticsRepository) GetMonthlyBuckets(ctx context.Context, from, to time.Time) ([]*domain.TimeBucket, error) {
	return r.getBuckets(ctx, from, to, "%Y-%m", "monthly")
}

// getBuckets is a helper that retrieves aggregated event counts by time bucket
func (r *AnalyticsRepository) getBuckets(ctx context.Context, from, to time.Time, strftimeFormat, bucketType string) ([]*domain.TimeBucket, error) {
	// Build the WHERE clause based on whether we have a start time
	// Format times as SQLite-compatible strings for proper comparison
	var whereClause string
	var args []any
	if from.IsZero() {
		whereClause = "created_at <= ?"
		args = []any{to.UTC().Format(sqliteTimeFormat)}
	} else {
		whereClause = "created_at >= ? AND created_at <= ?"
		args = []any{from.UTC().Format(sqliteTimeFormat), to.UTC().Format(sqliteTimeFormat)}
	}

	query := `
		SELECT
			strftime('` + strftimeFormat + `', created_at) as bucket,
			MIN(created_at) as bucket_start,
			SUM(CASE WHEN event_type = ? THEN 1 ELSE 0 END) as rooms_created,
			SUM(CASE WHEN event_type = ? THEN 1 ELSE 0 END) as votes_cast,
			SUM(CASE WHEN event_type = ? THEN 1 ELSE 0 END) as votes_revealed,
			SUM(CASE WHEN event_type = ? THEN 1 ELSE 0 END) as rooms_closed
		FROM analytics_events
		WHERE ` + whereClause + ` AND created_at IS NOT NULL
		GROUP BY bucket
		HAVING bucket IS NOT NULL
		ORDER BY bucket ASC
	`

	queryArgs := append([]any{
		domain.EventTypeRoomCreated,
		domain.EventTypeVoteCast,
		domain.EventTypeVoteRevealed,
		domain.EventTypeRoomClosed,
	}, args...)

	rows, err := r.db.QueryContext(ctx, query, queryArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var buckets []*domain.TimeBucket
	for rows.Next() {
		var bucketLabel sql.NullString
		var bucketStartStr sql.NullString
		bucket := &domain.TimeBucket{}

		if err := rows.Scan(&bucketLabel, &bucketStartStr, &bucket.RoomsCreated, &bucket.VotesCast, &bucket.VotesRevealed, &bucket.RoomsClosed); err != nil {
			return nil, err
		}

		// Skip rows with NULL bucket
		if !bucketLabel.Valid {
			continue
		}

		// Parse the timestamp string manually since SQLite returns datetime as text
		if bucketStartStr.Valid {
			if t, err := time.Parse(sqliteTimeFormat, bucketStartStr.String); err == nil {
				bucket.Timestamp = t
			}
		}
		bucket.Label = formatBucketLabel(bucketLabel.String, bucketType)
		buckets = append(buckets, bucket)
	}

	return buckets, rows.Err()
}

// formatBucketLabel converts a bucket key to a human-readable label
func formatBucketLabel(bucketKey, bucketType string) string {
	switch bucketType {
	case "hourly":
		// Parse "2024-01-15 14:00:00" -> "2 PM"
		t, err := time.Parse("2006-01-02 15:00:00", bucketKey)
		if err != nil {
			return bucketKey
		}
		hour := t.Hour()
		if hour == 0 {
			return "12 AM"
		} else if hour < 12 {
			return time.Date(2000, 1, 1, hour, 0, 0, 0, time.UTC).Format("3 PM")[0:1] + " AM"
		} else if hour == 12 {
			return "12 PM"
		}
		return time.Date(2000, 1, 1, hour, 0, 0, 0, time.UTC).Format("3 PM")

	case "daily":
		// Parse "2024-01-15" -> "Jan 15"
		t, err := time.Parse("2006-01-02", bucketKey)
		if err != nil {
			return bucketKey
		}
		return t.Format("Jan 2")

	case "weekly":
		// "2024-W03" -> "Week 3"
		if len(bucketKey) >= 7 && bucketKey[4] == '-' && bucketKey[5] == 'W' {
			weekNum := bucketKey[6:]
			// Remove leading zero
			if len(weekNum) > 0 && weekNum[0] == '0' {
				weekNum = weekNum[1:]
			}
			return "Week " + weekNum
		}
		return bucketKey

	case "monthly":
		// Parse "2024-01" -> "Jan 2024"
		t, err := time.Parse("2006-01", bucketKey)
		if err != nil {
			return bucketKey
		}
		return t.Format("Jan 2006")

	default:
		return bucketKey
	}
}

// Ensure AnalyticsRepository implements the interface
var _ secondary.AnalyticsRepository = (*AnalyticsRepository)(nil)
