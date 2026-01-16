package connectrpc

import (
	"context"
	"net/http"

	"connectrpc.com/connect"

	"github.com/vicmanager/esteemed/backend/internal/domain"
	"github.com/vicmanager/esteemed/backend/internal/ports/primary"
	esteemedv1 "github.com/vicmanager/esteemed/backend/gen/esteemed/v1"
	"github.com/vicmanager/esteemed/backend/gen/esteemed/v1/esteemedv1connect"
)

// RoomHandler implements the ConnectRPC RoomService
type RoomHandler struct {
	service primary.RoomService
}

// NewRoomHandler creates a new room handler
func NewRoomHandler(service primary.RoomService) *RoomHandler {
	return &RoomHandler{service: service}
}

// Handler returns the ConnectRPC handler
func (h *RoomHandler) Handler() (string, http.Handler) {
	return esteemedv1connect.NewRoomServiceHandler(h)
}

// CreateRoom creates a new room
func (h *RoomHandler) CreateRoom(
	ctx context.Context,
	req *connect.Request[esteemedv1.CreateRoomRequest],
) (*connect.Response[esteemedv1.CreateRoomResponse], error) {
	result, err := h.service.CreateRoom(ctx, req.Msg.HostName)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&esteemedv1.CreateRoomResponse{
		Room:          domainRoomToProto(result.Room),
		SessionToken:  result.SessionToken,
		ParticipantId: result.ParticipantID,
	}), nil
}

// JoinRoom adds a participant to a room
func (h *RoomHandler) JoinRoom(
	ctx context.Context,
	req *connect.Request[esteemedv1.JoinRoomRequest],
) (*connect.Response[esteemedv1.JoinRoomResponse], error) {
	result, err := h.service.JoinRoom(ctx, req.Msg.RoomId, req.Msg.ParticipantName, req.Msg.SessionToken)
	if err != nil {
		if err == domain.ErrRoomNotFound {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&esteemedv1.JoinRoomResponse{
		Room:          domainRoomToProto(result.Room),
		SessionToken:  result.SessionToken,
		ParticipantId: result.ParticipantID,
	}), nil
}

// LeaveRoom removes a participant from a room
func (h *RoomHandler) LeaveRoom(
	ctx context.Context,
	req *connect.Request[esteemedv1.LeaveRoomRequest],
) (*connect.Response[esteemedv1.LeaveRoomResponse], error) {
	err := h.service.LeaveRoom(ctx, req.Msg.RoomId, req.Msg.ParticipantId, req.Msg.SessionToken)
	if err != nil {
		if err == domain.ErrRoomNotFound {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		if err == domain.ErrInvalidToken {
			return nil, connect.NewError(connect.CodePermissionDenied, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&esteemedv1.LeaveRoomResponse{}), nil
}

// GetRoom returns the current room state
func (h *RoomHandler) GetRoom(
	ctx context.Context,
	req *connect.Request[esteemedv1.GetRoomRequest],
) (*connect.Response[esteemedv1.GetRoomResponse], error) {
	room, err := h.service.GetRoom(ctx, req.Msg.RoomId)
	if err != nil {
		if err == domain.ErrRoomNotFound {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&esteemedv1.GetRoomResponse{
		Room: domainRoomToProto(room),
	}), nil
}

// WatchRoom streams room events
func (h *RoomHandler) WatchRoom(
	ctx context.Context,
	req *connect.Request[esteemedv1.WatchRoomRequest],
	stream *connect.ServerStream[esteemedv1.RoomEvent],
) error {
	eventCh, err := h.service.WatchRoom(ctx, req.Msg.RoomId, req.Msg.SessionToken)
	if err != nil {
		if err == domain.ErrRoomNotFound {
			return connect.NewError(connect.CodeNotFound, err)
		}
		return connect.NewError(connect.CodeInternal, err)
	}

	for {
		select {
		case <-ctx.Done():
			return nil
		case event, ok := <-eventCh:
			if !ok {
				return nil
			}

			protoEvent := domainRoomEventToProto(event)
			if err := stream.Send(protoEvent); err != nil {
				return err
			}
		}
	}
}

// Helper functions to convert domain types to proto types

func domainRoomToProto(room *domain.Room) *esteemedv1.Room {
	participants := make([]*esteemedv1.Participant, 0, len(room.Participants))
	for _, p := range room.GetParticipants() {
		participants = append(participants, &esteemedv1.Participant{
			Id:          p.ID,
			Name:        p.Name,
			IsHost:      p.IsHost,
			IsConnected: p.IsConnected,
			JoinedAt:    p.JoinedAt.Unix(),
		})
	}

	return &esteemedv1.Room{
		Id:           room.ID,
		Name:         room.Name,
		Participants: participants,
		State:        domainStateToProto(room.GetState()),
		CurrentTopic: room.CurrentTopic,
		CreatedAt:    room.CreatedAt.Unix(),
	}
}

func domainStateToProto(state domain.RoomState) esteemedv1.RoomState {
	switch state {
	case domain.RoomStateWaiting:
		return esteemedv1.RoomState_ROOM_STATE_WAITING
	case domain.RoomStateVoting:
		return esteemedv1.RoomState_ROOM_STATE_VOTING
	case domain.RoomStateRevealed:
		return esteemedv1.RoomState_ROOM_STATE_REVEALED
	default:
		return esteemedv1.RoomState_ROOM_STATE_UNSPECIFIED
	}
}

func domainRoomEventToProto(event primary.RoomEvent) *esteemedv1.RoomEvent {
	protoEvent := &esteemedv1.RoomEvent{}

	switch event.Type {
	case primary.RoomEventParticipantJoined:
		protoEvent.Event = &esteemedv1.RoomEvent_ParticipantJoined{
			ParticipantJoined: &esteemedv1.ParticipantJoined{
				Participant: &esteemedv1.Participant{
					Id:          event.Participant.ID,
					Name:        event.Participant.Name,
					IsHost:      event.Participant.IsHost,
					IsConnected: event.Participant.IsConnected,
					JoinedAt:    event.Participant.JoinedAt.Unix(),
				},
			},
		}
	case primary.RoomEventParticipantLeft:
		protoEvent.Event = &esteemedv1.RoomEvent_ParticipantLeft{
			ParticipantLeft: &esteemedv1.ParticipantLeft{
				ParticipantId: event.ParticipantID,
			},
		}
	case primary.RoomEventStateChanged:
		protoEvent.Event = &esteemedv1.RoomEvent_StateChanged{
			StateChanged: &esteemedv1.RoomStateChanged{
				NewState: domainStateToProto(event.NewState),
			},
		}
	case primary.RoomEventTopicChanged:
		protoEvent.Event = &esteemedv1.RoomEvent_TopicChanged{
			TopicChanged: &esteemedv1.TopicChanged{
				Topic: event.Topic,
			},
		}
	case primary.RoomEventClosed:
		protoEvent.Event = &esteemedv1.RoomEvent_RoomClosed{
			RoomClosed: &esteemedv1.RoomClosed{
				Reason: event.Reason,
			},
		}
	}

	return protoEvent
}
