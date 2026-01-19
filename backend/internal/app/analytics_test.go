package app

import (
	"testing"
	"time"

	"github.com/vicmanager/esteemed/backend/internal/domain"
)

func TestFillMissingBuckets_Empty(t *testing.T) {
	start := time.Date(2026, 1, 19, 0, 0, 0, 0, time.Local)
	end := time.Date(2026, 1, 19, 5, 0, 0, 0, time.Local)

	result := fillMissingBuckets(nil, start, end, domain.GranularityHourly)

	if len(result) != 6 {
		t.Errorf("expected 6 buckets (hours 0-5), got %d", len(result))
	}

	for _, b := range result {
		if b.RoomsCreated != 0 || b.VotesCast != 0 {
			t.Errorf("expected all zeros, got rooms=%d votes=%d", b.RoomsCreated, b.VotesCast)
		}
	}
}

func TestFillMissingBuckets_WithData(t *testing.T) {
	start := time.Date(2026, 1, 19, 0, 0, 0, 0, time.Local)
	end := time.Date(2026, 1, 19, 3, 0, 0, 0, time.Local)

	// Simulate a bucket from the database at 2 AM with some data
	dbBuckets := []*domain.TimeBucket{
		{
			Timestamp:    time.Date(2026, 1, 19, 2, 30, 0, 0, time.Local), // Not normalized
			Label:        "2 AM",
			RoomsCreated: 5,
			VotesCast:    10,
		},
	}

	result := fillMissingBuckets(dbBuckets, start, end, domain.GranularityHourly)

	if len(result) != 4 {
		t.Errorf("expected 4 buckets (hours 0-3), got %d", len(result))
	}

	// Check that hour 2 has the data
	found := false
	for _, b := range result {
		if b.Timestamp.Hour() == 2 {
			found = true
			if b.RoomsCreated != 5 {
				t.Errorf("expected RoomsCreated=5 at hour 2, got %d", b.RoomsCreated)
			}
			if b.VotesCast != 10 {
				t.Errorf("expected VotesCast=10 at hour 2, got %d", b.VotesCast)
			}
		}
	}
	if !found {
		t.Error("bucket for hour 2 not found")
	}
}

func TestFillMissingBuckets_UTCToLocal(t *testing.T) {
	// This test simulates the real scenario where DB returns UTC times
	// but we generate buckets in local time
	loc := time.Local
	start := time.Date(2026, 1, 19, 0, 0, 0, 0, loc)
	end := time.Date(2026, 1, 19, 3, 0, 0, 0, loc)

	// Database returns UTC time (simulating what SQLite returns)
	utcTime := time.Date(2026, 1, 19, 2, 30, 0, 0, time.UTC)

	dbBuckets := []*domain.TimeBucket{
		{
			Timestamp:    utcTime, // UTC from database
			Label:        "2 AM",
			RoomsCreated: 7,
			VotesCast:    15,
		},
	}

	result := fillMissingBuckets(dbBuckets, start, end, domain.GranularityHourly)

	// The UTC time 2:30 AM should be converted to local time
	// and matched to the appropriate hour bucket
	expectedHour := utcTime.Local().Hour()

	found := false
	for _, b := range result {
		if b.RoomsCreated == 7 {
			found = true
			t.Logf("Found data at hour %d (expected around %d)", b.Timestamp.Hour(), expectedHour)
		}
	}
	if !found {
		t.Error("data from UTC bucket not found in result")
		for i, b := range result {
			t.Logf("bucket %d: hour=%d rooms=%d votes=%d", i, b.Timestamp.Hour(), b.RoomsCreated, b.VotesCast)
		}
	}
}

func TestBucketKey_Hourly(t *testing.T) {
	t1 := time.Date(2026, 1, 19, 14, 30, 45, 0, time.Local)
	t2 := time.Date(2026, 1, 19, 14, 0, 0, 0, time.Local)
	t3 := time.Date(2026, 1, 19, 14, 59, 59, 0, time.Local)

	key1 := bucketKey(t1, domain.GranularityHourly)
	key2 := bucketKey(t2, domain.GranularityHourly)
	key3 := bucketKey(t3, domain.GranularityHourly)

	if key1 != key2 || key2 != key3 {
		t.Errorf("expected same key for same hour, got %s, %s, %s", key1, key2, key3)
	}
}

func TestBucketKey_Daily(t *testing.T) {
	t1 := time.Date(2026, 1, 19, 0, 0, 0, 0, time.Local)
	t2 := time.Date(2026, 1, 19, 23, 59, 59, 0, time.Local)

	key1 := bucketKey(t1, domain.GranularityDaily)
	key2 := bucketKey(t2, domain.GranularityDaily)

	if key1 != key2 {
		t.Errorf("expected same key for same day, got %s and %s", key1, key2)
	}
}

func TestNormalizeToGranularity_Hourly(t *testing.T) {
	input := time.Date(2026, 1, 19, 14, 35, 45, 123, time.Local)
	expected := time.Date(2026, 1, 19, 14, 0, 0, 0, time.Local)

	result := normalizeToGranularity(input, domain.GranularityHourly)

	if !result.Equal(expected) {
		t.Errorf("expected %v, got %v", expected, result)
	}
}

func TestNormalizeToGranularity_Daily(t *testing.T) {
	input := time.Date(2026, 1, 19, 14, 35, 45, 123, time.Local)
	expected := time.Date(2026, 1, 19, 0, 0, 0, 0, time.Local)

	result := normalizeToGranularity(input, domain.GranularityDaily)

	if !result.Equal(expected) {
		t.Errorf("expected %v, got %v", expected, result)
	}
}

func TestGenerateEmptyBuckets_Hourly(t *testing.T) {
	start := time.Date(2026, 1, 19, 10, 0, 0, 0, time.Local)
	end := time.Date(2026, 1, 19, 14, 0, 0, 0, time.Local)

	result := generateEmptyBuckets(start, end, domain.GranularityHourly)

	if len(result) != 5 {
		t.Errorf("expected 5 buckets, got %d", len(result))
	}

	expectedHours := []int{10, 11, 12, 13, 14}
	for i, b := range result {
		if b.Timestamp.Hour() != expectedHours[i] {
			t.Errorf("bucket %d: expected hour %d, got %d", i, expectedHours[i], b.Timestamp.Hour())
		}
	}
}

func TestGenerateEmptyBuckets_Daily(t *testing.T) {
	start := time.Date(2026, 1, 15, 0, 0, 0, 0, time.Local)
	end := time.Date(2026, 1, 19, 0, 0, 0, 0, time.Local)

	result := generateEmptyBuckets(start, end, domain.GranularityDaily)

	if len(result) != 5 {
		t.Errorf("expected 5 buckets, got %d", len(result))
	}

	expectedDays := []int{15, 16, 17, 18, 19}
	for i, b := range result {
		if b.Timestamp.Day() != expectedDays[i] {
			t.Errorf("bucket %d: expected day %d, got %d", i, expectedDays[i], b.Timestamp.Day())
		}
	}
}

func TestCalculateChangePercent(t *testing.T) {
	tests := []struct {
		previous int64
		current  int64
		expected float64
	}{
		{100, 150, 50.0},
		{100, 50, -50.0},
		{0, 100, 100.0},
		{0, 0, 0.0},
		{100, 100, 0.0},
	}

	for _, tt := range tests {
		result := calculateChangePercent(tt.previous, tt.current)
		if result != tt.expected {
			t.Errorf("calculateChangePercent(%d, %d) = %f, expected %f", tt.previous, tt.current, result, tt.expected)
		}
	}
}
