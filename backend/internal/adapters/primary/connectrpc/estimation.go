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

// EstimationHandler implements the ConnectRPC EstimationService
type EstimationHandler struct {
	service primary.EstimationService
}

// NewEstimationHandler creates a new estimation handler
func NewEstimationHandler(service primary.EstimationService) *EstimationHandler {
	return &EstimationHandler{service: service}
}

// Handler returns the ConnectRPC handler
func (h *EstimationHandler) Handler() (string, http.Handler) {
	return esteemedv1connect.NewEstimationServiceHandler(h)
}

// CastVote submits a vote
func (h *EstimationHandler) CastVote(
	ctx context.Context,
	req *connect.Request[esteemedv1.CastVoteRequest],
) (*connect.Response[esteemedv1.CastVoteResponse], error) {
	err := h.service.CastVote(ctx, req.Msg.RoomId, req.Msg.ParticipantId, req.Msg.SessionToken, req.Msg.Value)
	if err != nil {
		return nil, mapDomainError(err)
	}

	return connect.NewResponse(&esteemedv1.CastVoteResponse{}), nil
}

// RevealVotes reveals all votes
func (h *EstimationHandler) RevealVotes(
	ctx context.Context,
	req *connect.Request[esteemedv1.RevealVotesRequest],
) (*connect.Response[esteemedv1.RevealVotesResponse], error) {
	summary, err := h.service.RevealVotes(ctx, req.Msg.RoomId, req.Msg.ParticipantId, req.Msg.SessionToken)
	if err != nil {
		return nil, mapDomainError(err)
	}

	return connect.NewResponse(&esteemedv1.RevealVotesResponse{
		Summary: domainSummaryToProto(summary),
	}), nil
}

// ResetRound clears all votes
func (h *EstimationHandler) ResetRound(
	ctx context.Context,
	req *connect.Request[esteemedv1.ResetRoundRequest],
) (*connect.Response[esteemedv1.ResetRoundResponse], error) {
	err := h.service.ResetRound(ctx, req.Msg.RoomId, req.Msg.ParticipantId, req.Msg.SessionToken)
	if err != nil {
		return nil, mapDomainError(err)
	}

	return connect.NewResponse(&esteemedv1.ResetRoundResponse{}), nil
}

// StartRound begins a new voting round
func (h *EstimationHandler) StartRound(
	ctx context.Context,
	req *connect.Request[esteemedv1.StartRoundRequest],
) (*connect.Response[esteemedv1.StartRoundResponse], error) {
	err := h.service.StartRound(ctx, req.Msg.RoomId, req.Msg.ParticipantId, req.Msg.SessionToken)
	if err != nil {
		return nil, mapDomainError(err)
	}

	return connect.NewResponse(&esteemedv1.StartRoundResponse{}), nil
}

// WatchVotes streams vote events
func (h *EstimationHandler) WatchVotes(
	ctx context.Context,
	req *connect.Request[esteemedv1.WatchVotesRequest],
	stream *connect.ServerStream[esteemedv1.VoteEvent],
) error {
	eventCh, err := h.service.WatchVotes(ctx, req.Msg.RoomId, req.Msg.SessionToken)
	if err != nil {
		return mapDomainError(err)
	}

	for {
		select {
		case <-ctx.Done():
			return nil
		case event, ok := <-eventCh:
			if !ok {
				return nil
			}

			protoEvent := domainVoteEventToProto(event)
			if err := stream.Send(protoEvent); err != nil {
				return err
			}
		}
	}
}

// Helper functions

func domainSummaryToProto(summary *domain.VoteSummary) *esteemedv1.VoteSummary {
	votes := make([]*esteemedv1.Vote, 0, len(summary.Votes))
	for _, v := range summary.Votes {
		votes = append(votes, &esteemedv1.Vote{
			ParticipantId:   v.ParticipantID,
			ParticipantName: v.ParticipantName,
			Value:           v.Value,
			HasVoted:        v.HasVoted,
		})
	}

	return &esteemedv1.VoteSummary{
		Votes:          votes,
		Average:        summary.Average,
		Mode:           summary.Mode,
		HasConsensus:   summary.HasConsensus,
		NumericAverage: summary.NumericAverage,
	}
}

func domainVoteEventToProto(event primary.VoteEvent) *esteemedv1.VoteEvent {
	protoEvent := &esteemedv1.VoteEvent{}

	switch event.Type {
	case primary.VoteEventCast:
		protoEvent.Event = &esteemedv1.VoteEvent_VoteCast{
			VoteCast: &esteemedv1.VoteCast{
				ParticipantId:   event.ParticipantID,
				ParticipantName: event.ParticipantName,
			},
		}
	case primary.VoteEventRevealed:
		protoEvent.Event = &esteemedv1.VoteEvent_VotesRevealed{
			VotesRevealed: &esteemedv1.VotesRevealed{
				Summary: domainSummaryToProto(event.Summary),
			},
		}
	case primary.VoteEventReset:
		protoEvent.Event = &esteemedv1.VoteEvent_RoundReset{
			RoundReset: &esteemedv1.RoundReset{},
		}
	}

	return protoEvent
}

func mapDomainError(err error) error {
	switch err {
	case domain.ErrRoomNotFound:
		return connect.NewError(connect.CodeNotFound, err)
	case domain.ErrParticipantNotFound:
		return connect.NewError(connect.CodeNotFound, err)
	case domain.ErrInvalidToken:
		return connect.NewError(connect.CodePermissionDenied, err)
	case domain.ErrNotHost:
		return connect.NewError(connect.CodePermissionDenied, err)
	case domain.ErrInvalidState:
		return connect.NewError(connect.CodeFailedPrecondition, err)
	case domain.ErrInvalidCardValue:
		return connect.NewError(connect.CodeInvalidArgument, err)
	case domain.ErrSpectatorCannotVote:
		return connect.NewError(connect.CodePermissionDenied, err)
	default:
		return connect.NewError(connect.CodeInternal, err)
	}
}
