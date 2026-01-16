package connectrpc

import (
	"context"

	"connectrpc.com/connect"

	"github.com/vicmanager/esteemed/backend/internal/domain"
	"github.com/vicmanager/esteemed/backend/internal/ports/primary"
	esteemedv1 "github.com/vicmanager/esteemed/backend/gen/esteemed/v1"
	"github.com/vicmanager/esteemed/backend/gen/esteemed/v1/esteemedv1connect"
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
func (h *EstimationHandler) Handler() (string, esteemedv1connect.EstimationServiceHandler) {
	return esteemedv1connect.NewEstimationServiceHandler(h)
}

// CastVote submits a vote
func (h *EstimationHandler) CastVote(
	ctx context.Context,
	req *connect.Request[esteemedv1.CastVoteRequest],
) (*connect.Response[esteemedv1.CastVoteResponse], error) {
	value := protoCardValueToDomain(req.Msg.Value)

	err := h.service.CastVote(ctx, req.Msg.RoomId, req.Msg.ParticipantId, req.Msg.SessionToken, value)
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

// SetTopic sets the current topic
func (h *EstimationHandler) SetTopic(
	ctx context.Context,
	req *connect.Request[esteemedv1.SetTopicRequest],
) (*connect.Response[esteemedv1.SetTopicResponse], error) {
	err := h.service.SetTopic(ctx, req.Msg.RoomId, req.Msg.ParticipantId, req.Msg.SessionToken, req.Msg.Topic)
	if err != nil {
		return nil, mapDomainError(err)
	}

	return connect.NewResponse(&esteemedv1.SetTopicResponse{}), nil
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

func protoCardValueToDomain(value esteemedv1.CardValue) domain.CardValue {
	switch value {
	case esteemedv1.CardValue_CARD_VALUE_ONE:
		return domain.CardValueOne
	case esteemedv1.CardValue_CARD_VALUE_TWO:
		return domain.CardValueTwo
	case esteemedv1.CardValue_CARD_VALUE_THREE:
		return domain.CardValueThree
	case esteemedv1.CardValue_CARD_VALUE_FIVE:
		return domain.CardValueFive
	case esteemedv1.CardValue_CARD_VALUE_EIGHT:
		return domain.CardValueEight
	case esteemedv1.CardValue_CARD_VALUE_THIRTEEN:
		return domain.CardValueThirteen
	case esteemedv1.CardValue_CARD_VALUE_TWENTY_ONE:
		return domain.CardValueTwentyOne
	case esteemedv1.CardValue_CARD_VALUE_QUESTION:
		return domain.CardValueQuestion
	case esteemedv1.CardValue_CARD_VALUE_COFFEE:
		return domain.CardValueCoffee
	default:
		return domain.CardValueUnspecified
	}
}

func domainCardValueToProto(value domain.CardValue) esteemedv1.CardValue {
	switch value {
	case domain.CardValueOne:
		return esteemedv1.CardValue_CARD_VALUE_ONE
	case domain.CardValueTwo:
		return esteemedv1.CardValue_CARD_VALUE_TWO
	case domain.CardValueThree:
		return esteemedv1.CardValue_CARD_VALUE_THREE
	case domain.CardValueFive:
		return esteemedv1.CardValue_CARD_VALUE_FIVE
	case domain.CardValueEight:
		return esteemedv1.CardValue_CARD_VALUE_EIGHT
	case domain.CardValueThirteen:
		return esteemedv1.CardValue_CARD_VALUE_THIRTEEN
	case domain.CardValueTwentyOne:
		return esteemedv1.CardValue_CARD_VALUE_TWENTY_ONE
	case domain.CardValueQuestion:
		return esteemedv1.CardValue_CARD_VALUE_QUESTION
	case domain.CardValueCoffee:
		return esteemedv1.CardValue_CARD_VALUE_COFFEE
	default:
		return esteemedv1.CardValue_CARD_VALUE_UNSPECIFIED
	}
}

func domainSummaryToProto(summary *domain.VoteSummary) *esteemedv1.VoteSummary {
	votes := make([]*esteemedv1.Vote, 0, len(summary.Votes))
	for _, v := range summary.Votes {
		votes = append(votes, &esteemedv1.Vote{
			ParticipantId:   v.ParticipantID,
			ParticipantName: v.ParticipantName,
			Value:           domainCardValueToProto(v.Value),
			HasVoted:        v.HasVoted,
		})
	}

	return &esteemedv1.VoteSummary{
		Votes:        votes,
		Average:      domainCardValueToProto(summary.Average),
		Mode:         domainCardValueToProto(summary.Mode),
		HasConsensus: summary.HasConsensus,
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
	default:
		return connect.NewError(connect.CodeInternal, err)
	}
}
