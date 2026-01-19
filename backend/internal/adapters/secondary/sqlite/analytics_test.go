package sqlite

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/vicmanager/esteemed/backend/internal/domain"
)

func setupTestRepo(t *testing.T) (*AnalyticsRepository, func()) {
	t.Helper()

	// Create a temp file for the test database
	f, err := os.CreateTemp("", "analytics_test_*.db")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	dbPath := f.Name()
	f.Close()

	repo, err := NewAnalyticsRepository(dbPath)
	if err != nil {
		os.Remove(dbPath)
		t.Fatalf("failed to create repo: %v", err)
	}

	cleanup := func() {
		repo.Close()
		os.Remove(dbPath)
	}

	return repo, cleanup
}

func TestRecordAndGetSummary(t *testing.T) {
	repo, cleanup := setupTestRepo(t)
	defer cleanup()

	ctx := context.Background()

	// Record some events
	events := []*domain.AnalyticsEvent{
		domain.NewAnalyticsEvent(domain.EventTypeRoomCreated, "room1", ""),
		domain.NewAnalyticsEvent(domain.EventTypeRoomCreated, "room2", ""),
		domain.NewAnalyticsEvent(domain.EventTypeVoteCast, "room1", ""),
		domain.NewAnalyticsEvent(domain.EventTypeVoteCast, "room1", ""),
		domain.NewAnalyticsEvent(domain.EventTypeVoteCast, "room1", ""),
		domain.NewAnalyticsEvent(domain.EventTypeVoteRevealed, "room1", ""),
		domain.NewAnalyticsEvent(domain.EventTypeRoomClosed, "room1", ""),
	}

	for _, e := range events {
		if err := repo.RecordEvent(ctx, e); err != nil {
			t.Fatalf("failed to record event: %v", err)
		}
	}

	// Get summary for all time
	summary, err := repo.GetSummary(ctx)
	if err != nil {
		t.Fatalf("failed to get summary: %v", err)
	}

	if summary.TotalRooms != 2 {
		t.Errorf("expected 2 rooms, got %d", summary.TotalRooms)
	}
	if summary.TotalVotes != 3 {
		t.Errorf("expected 3 votes, got %d", summary.TotalVotes)
	}
	if summary.TotalReveals != 1 {
		t.Errorf("expected 1 reveal, got %d", summary.TotalReveals)
	}
	if summary.TotalClosures != 1 {
		t.Errorf("expected 1 closure, got %d", summary.TotalClosures)
	}
}

func TestGetAggregatedStats(t *testing.T) {
	repo, cleanup := setupTestRepo(t)
	defer cleanup()

	ctx := context.Background()

	// Record events
	events := []*domain.AnalyticsEvent{
		domain.NewAnalyticsEvent(domain.EventTypeRoomCreated, "room1", ""),
		domain.NewAnalyticsEvent(domain.EventTypeVoteCast, "room1", ""),
	}

	for _, e := range events {
		if err := repo.RecordEvent(ctx, e); err != nil {
			t.Fatalf("failed to record event: %v", err)
		}
	}

	// Query with time range that includes now
	now := time.Now()
	from := now.Add(-time.Hour)
	to := now.Add(time.Hour)

	summary, err := repo.GetAggregatedStats(ctx, from, to)
	if err != nil {
		t.Fatalf("failed to get aggregated stats: %v", err)
	}

	if summary.TotalRooms != 1 {
		t.Errorf("expected 1 room, got %d", summary.TotalRooms)
	}
	if summary.TotalVotes != 1 {
		t.Errorf("expected 1 vote, got %d", summary.TotalVotes)
	}
}

func TestGetHourlyBuckets(t *testing.T) {
	repo, cleanup := setupTestRepo(t)
	defer cleanup()

	ctx := context.Background()

	// Record events
	events := []*domain.AnalyticsEvent{
		domain.NewAnalyticsEvent(domain.EventTypeRoomCreated, "room1", ""),
		domain.NewAnalyticsEvent(domain.EventTypeVoteCast, "room1", ""),
		domain.NewAnalyticsEvent(domain.EventTypeVoteCast, "room1", ""),
	}

	for _, e := range events {
		if err := repo.RecordEvent(ctx, e); err != nil {
			t.Fatalf("failed to record event: %v", err)
		}
	}

	// Query with time range that includes now
	now := time.Now()
	from := now.Add(-time.Hour)
	to := now.Add(time.Hour)

	buckets, err := repo.GetHourlyBuckets(ctx, from, to)
	if err != nil {
		t.Fatalf("failed to get hourly buckets: %v", err)
	}

	t.Logf("Got %d buckets", len(buckets))
	for i, b := range buckets {
		t.Logf("Bucket %d: timestamp=%v label=%s rooms=%d votes=%d reveals=%d closed=%d",
			i, b.Timestamp, b.Label, b.RoomsCreated, b.VotesCast, b.VotesRevealed, b.RoomsClosed)
	}

	if len(buckets) == 0 {
		t.Fatal("expected at least 1 bucket, got 0")
	}

	// Find the bucket with our data
	found := false
	for _, b := range buckets {
		if b.RoomsCreated == 1 && b.VotesCast == 2 {
			found = true
			break
		}
	}
	if !found {
		t.Error("expected bucket with RoomsCreated=1, VotesCast=2 not found")
	}
}

func TestGetDailyBuckets(t *testing.T) {
	repo, cleanup := setupTestRepo(t)
	defer cleanup()

	ctx := context.Background()

	// Record events
	events := []*domain.AnalyticsEvent{
		domain.NewAnalyticsEvent(domain.EventTypeRoomCreated, "room1", ""),
		domain.NewAnalyticsEvent(domain.EventTypeVoteCast, "room1", ""),
	}

	for _, e := range events {
		if err := repo.RecordEvent(ctx, e); err != nil {
			t.Fatalf("failed to record event: %v", err)
		}
	}

	// Query last 7 days
	now := time.Now()
	from := now.AddDate(0, 0, -7)
	to := now.Add(time.Hour)

	buckets, err := repo.GetDailyBuckets(ctx, from, to)
	if err != nil {
		t.Fatalf("failed to get daily buckets: %v", err)
	}

	t.Logf("Got %d buckets", len(buckets))
	for i, b := range buckets {
		t.Logf("Bucket %d: timestamp=%v label=%s rooms=%d votes=%d",
			i, b.Timestamp, b.Label, b.RoomsCreated, b.VotesCast)
	}

	if len(buckets) == 0 {
		t.Fatal("expected at least 1 bucket, got 0")
	}

	// Verify we got the data
	totalRooms := int64(0)
	totalVotes := int64(0)
	for _, b := range buckets {
		totalRooms += b.RoomsCreated
		totalVotes += b.VotesCast
	}

	if totalRooms != 1 {
		t.Errorf("expected total rooms 1, got %d", totalRooms)
	}
	if totalVotes != 1 {
		t.Errorf("expected total votes 1, got %d", totalVotes)
	}
}

func TestTimeFormatting(t *testing.T) {
	// Test that our time format matches SQLite's CURRENT_TIMESTAMP format
	now := time.Now().UTC()
	formatted := now.Format(sqliteTimeFormat)
	t.Logf("Formatted time: %s", formatted)

	// Parse it back
	parsed, err := time.Parse(sqliteTimeFormat, formatted)
	if err != nil {
		t.Fatalf("failed to parse formatted time: %v", err)
	}

	// Check they're equivalent (ignoring sub-second precision)
	if now.Unix() != parsed.Unix() {
		t.Errorf("times don't match: original=%v parsed=%v", now, parsed)
	}
}

func TestDebugTimeStorage(t *testing.T) {
	repo, cleanup := setupTestRepo(t)
	defer cleanup()

	ctx := context.Background()

	// Record an event
	event := domain.NewAnalyticsEvent(domain.EventTypeRoomCreated, "room1", "")
	if err := repo.RecordEvent(ctx, event); err != nil {
		t.Fatalf("failed to record event: %v", err)
	}

	// Query the raw data to see how it's stored
	var storedTime string
	row := repo.db.QueryRowContext(ctx, "SELECT created_at FROM analytics_events LIMIT 1")
	if err := row.Scan(&storedTime); err != nil {
		t.Fatalf("failed to scan: %v", err)
	}
	t.Logf("Stored time in DB: %q", storedTime)

	// Now test the comparison
	now := time.Now()
	from := now.Add(-time.Hour)
	to := now.Add(time.Hour)

	fromStr := from.UTC().Format(sqliteTimeFormat)
	toStr := to.UTC().Format(sqliteTimeFormat)
	t.Logf("Query from: %q", fromStr)
	t.Logf("Query to: %q", toStr)
	t.Logf("Stored: %q", storedTime)

	// Manual comparison
	t.Logf("storedTime >= fromStr: %v", storedTime >= fromStr)
	t.Logf("storedTime <= toStr: %v", storedTime <= toStr)

	// Test the actual query
	var count int
	query := "SELECT COUNT(*) FROM analytics_events WHERE created_at >= ? AND created_at <= ?"
	row = repo.db.QueryRowContext(ctx, query, fromStr, toStr)
	if err := row.Scan(&count); err != nil {
		t.Fatalf("failed to scan count: %v", err)
	}
	t.Logf("Count with string params: %d", count)
}
