package connectrpc

import (
	"context"
	"net/http"

	"connectrpc.com/connect"

	esteemedv1 "github.com/vicmanager/esteemed/backend/gen/esteemed/v1"
	"github.com/vicmanager/esteemed/backend/gen/esteemed/v1/esteemedv1connect"
	"github.com/vicmanager/esteemed/backend/internal/domain"
	"github.com/vicmanager/esteemed/backend/internal/ports/secondary"
)

// EventHandler implements the ConnectRPC EventService
type EventHandler struct {
	appPublisher secondary.AppEventPublisher
}

// NewEventHandler creates a new event handler
func NewEventHandler(appPublisher secondary.AppEventPublisher) *EventHandler {
	return &EventHandler{appPublisher: appPublisher}
}

// Handler returns the ConnectRPC handler
func (h *EventHandler) Handler() (string, http.Handler) {
	return esteemedv1connect.NewEventServiceHandler(h)
}

// WatchEvents streams application-wide events
func (h *EventHandler) WatchEvents(
	ctx context.Context,
	req *connect.Request[esteemedv1.WatchEventsRequest],
	stream *connect.ServerStream[esteemedv1.AppEvent],
) error {
	// Build type filter set
	typeFilter := make(map[domain.AppEventType]bool)
	for _, t := range req.Msg.Types {
		domainType := protoEventTypeToDomain(t)
		if domainType != 0 {
			typeFilter[domainType] = true
		}
	}

	// Subscribe to events
	eventCh, unsubscribe := h.appPublisher.Subscribe(ctx)
	defer unsubscribe()

	for {
		select {
		case <-ctx.Done():
			return nil
		case event, ok := <-eventCh:
			if !ok {
				return nil
			}

			// Apply type filter (empty filter = all types)
			if len(typeFilter) > 0 && !typeFilter[event.Type] {
				continue
			}

			protoEvent := domainAppEventToProto(event)
			if err := stream.Send(protoEvent); err != nil {
				return err
			}
		}
	}
}

// protoEventTypeToDomain converts proto event type to domain
func protoEventTypeToDomain(t esteemedv1.AppEventType) domain.AppEventType {
	switch t {
	case esteemedv1.AppEventType_APP_EVENT_TYPE_ROOM_CREATED:
		return domain.AppEventTypeRoomCreated
	case esteemedv1.AppEventType_APP_EVENT_TYPE_ROOM_CLOSED:
		return domain.AppEventTypeRoomClosed
	case esteemedv1.AppEventType_APP_EVENT_TYPE_VOTE_CAST:
		return domain.AppEventTypeVoteCast
	case esteemedv1.AppEventType_APP_EVENT_TYPE_VOTE_REVEALED:
		return domain.AppEventTypeVoteRevealed
	default:
		return 0
	}
}

// domainEventTypeToProto converts domain event type to proto
func domainEventTypeToProto(t domain.AppEventType) esteemedv1.AppEventType {
	switch t {
	case domain.AppEventTypeRoomCreated:
		return esteemedv1.AppEventType_APP_EVENT_TYPE_ROOM_CREATED
	case domain.AppEventTypeRoomClosed:
		return esteemedv1.AppEventType_APP_EVENT_TYPE_ROOM_CLOSED
	case domain.AppEventTypeVoteCast:
		return esteemedv1.AppEventType_APP_EVENT_TYPE_VOTE_CAST
	case domain.AppEventTypeVoteRevealed:
		return esteemedv1.AppEventType_APP_EVENT_TYPE_VOTE_REVEALED
	default:
		return esteemedv1.AppEventType_APP_EVENT_TYPE_UNSPECIFIED
	}
}

// domainAppEventToProto converts domain event to proto
func domainAppEventToProto(event domain.AppEvent) *esteemedv1.AppEvent {
	protoEvent := &esteemedv1.AppEvent{
		Type:      domainEventTypeToProto(event.Type),
		Timestamp: event.Timestamp.UnixMilli(),
		RoomId:    event.RoomID,
		RoomName:  event.RoomName,
	}

	switch event.Type {
	case domain.AppEventTypeRoomCreated:
		if event.RoomCreated != nil {
			protoEvent.Payload = &esteemedv1.AppEvent_RoomCreated{
				RoomCreated: &esteemedv1.RoomCreatedPayload{
					HostName: event.RoomCreated.HostName,
				},
			}
		}
	case domain.AppEventTypeRoomClosed:
		if event.RoomClosed != nil {
			protoEvent.Payload = &esteemedv1.AppEvent_RoomClosed{
				RoomClosed: &esteemedv1.RoomClosedPayload{
					Reason: event.RoomClosed.Reason,
				},
			}
		}
	case domain.AppEventTypeVoteCast:
		if event.VoteCast != nil {
			protoEvent.Payload = &esteemedv1.AppEvent_VoteCast{
				VoteCast: &esteemedv1.VoteCastPayload{
					ParticipantName: event.VoteCast.ParticipantName,
					VotesInRound:    int32(event.VoteCast.VotesInRound),
				},
			}
		}
	case domain.AppEventTypeVoteRevealed:
		if event.VoteRevealed != nil {
			protoEvent.Payload = &esteemedv1.AppEvent_VoteRevealed{
				VoteRevealed: &esteemedv1.VoteRevealedPayload{
					VoteCount: int32(event.VoteRevealed.VoteCount),
					Consensus: event.VoteRevealed.Consensus,
					Average:   event.VoteRevealed.Average,
				},
			}
		}
	}

	return protoEvent
}
