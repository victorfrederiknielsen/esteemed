package connectrpc

import (
	"context"
	"net/http"

	"connectrpc.com/connect"

	esteemedv1 "github.com/vicmanager/esteemed/backend/gen/esteemed/v1"
	"github.com/vicmanager/esteemed/backend/gen/esteemed/v1/esteemedv1connect"
	"github.com/vicmanager/esteemed/backend/internal/domain"
	"github.com/vicmanager/esteemed/backend/internal/ports/primary"
)

// AnalyticsHandler implements the ConnectRPC AnalyticsService
type AnalyticsHandler struct {
	service primary.AnalyticsService
}

// NewAnalyticsHandler creates a new analytics handler
func NewAnalyticsHandler(service primary.AnalyticsService) *AnalyticsHandler {
	return &AnalyticsHandler{service: service}
}

// Handler returns the ConnectRPC handler
func (h *AnalyticsHandler) Handler() (string, http.Handler) {
	return esteemedv1connect.NewAnalyticsServiceHandler(h)
}

// GetAnalytics returns aggregated analytics with time buckets
func (h *AnalyticsHandler) GetAnalytics(
	ctx context.Context,
	req *connect.Request[esteemedv1.GetAnalyticsRequest],
) (*connect.Response[esteemedv1.GetAnalyticsResponse], error) {
	dateRange := protoDateRangeToDomain(req.Msg.DateRange)

	result, err := h.service.GetAnalytics(ctx, dateRange)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Convert domain result to proto
	protoBuckets := make([]*esteemedv1.TimeBucket, 0, len(result.Buckets))
	for _, b := range result.Buckets {
		protoBuckets = append(protoBuckets, &esteemedv1.TimeBucket{
			Timestamp:     b.Timestamp.Unix(),
			Label:         b.Label,
			RoomsCreated:  b.RoomsCreated,
			VotesCast:     b.VotesCast,
			VotesRevealed: b.VotesRevealed,
			RoomsClosed:   b.RoomsClosed,
		})
	}

	return connect.NewResponse(&esteemedv1.GetAnalyticsResponse{
		Summary: &esteemedv1.AnalyticsSummary{
			TotalRooms:         result.Summary.TotalRooms,
			TotalVotes:         result.Summary.TotalVotes,
			TotalReveals:       result.Summary.TotalReveals,
			TotalClosures:      result.Summary.TotalClosures,
			RoomsChangePercent: result.Summary.RoomsChangePercent,
			VotesChangePercent: result.Summary.VotesChangePercent,
		},
		Buckets:     protoBuckets,
		Granularity: domainGranularityToProto(result.Granularity),
		StartTime:   result.StartTime.Unix(),
		EndTime:     result.EndTime.Unix(),
	}), nil
}

// protoDateRangeToDomain converts proto DateRange to domain DateRange
func protoDateRangeToDomain(dr esteemedv1.DateRange) domain.DateRange {
	switch dr {
	case esteemedv1.DateRange_DATE_RANGE_TODAY:
		return domain.DateRangeToday
	case esteemedv1.DateRange_DATE_RANGE_LAST_7_DAYS:
		return domain.DateRangeLast7Days
	case esteemedv1.DateRange_DATE_RANGE_LAST_30_DAYS:
		return domain.DateRangeLast30Days
	case esteemedv1.DateRange_DATE_RANGE_LAST_90_DAYS:
		return domain.DateRangeLast90Days
	case esteemedv1.DateRange_DATE_RANGE_ALL_TIME:
		return domain.DateRangeAllTime
	default:
		return domain.DateRangeLast7Days
	}
}

// domainGranularityToProto converts domain Granularity to proto Granularity
func domainGranularityToProto(g domain.Granularity) esteemedv1.Granularity {
	switch g {
	case domain.GranularityHourly:
		return esteemedv1.Granularity_GRANULARITY_HOURLY
	case domain.GranularityDaily:
		return esteemedv1.Granularity_GRANULARITY_DAILY
	case domain.GranularityWeekly:
		return esteemedv1.Granularity_GRANULARITY_WEEKLY
	case domain.GranularityMonthly:
		return esteemedv1.Granularity_GRANULARITY_MONTHLY
	default:
		return esteemedv1.Granularity_GRANULARITY_UNSPECIFIED
	}
}
