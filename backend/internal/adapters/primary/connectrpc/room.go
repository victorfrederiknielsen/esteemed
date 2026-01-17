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

// ListRooms returns all active rooms
func (h *RoomHandler) ListRooms(
	ctx context.Context,
	req *connect.Request[esteemedv1.ListRoomsRequest],
) (*connect.Response[esteemedv1.ListRoomsResponse], error) {
	summaries, err := h.service.ListRooms(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoSummaries := make([]*esteemedv1.RoomSummary, 0, len(summaries))
	for _, s := range summaries {
		protoSummaries = append(protoSummaries, &esteemedv1.RoomSummary{
			Id:               s.ID,
			Name:             s.Name,
			ParticipantCount: int32(s.ParticipantCount),
			State:            domainStateToProto(s.State),
			CreatedAt:        s.CreatedAt,
			ExpiresAt:        s.ExpiresAt,
		})
	}

	return connect.NewResponse(&esteemedv1.ListRoomsResponse{
		Rooms: protoSummaries,
	}), nil
}

// CreateRoom creates a new room
func (h *RoomHandler) CreateRoom(
	ctx context.Context,
	req *connect.Request[esteemedv1.CreateRoomRequest],
) (*connect.Response[esteemedv1.CreateRoomResponse], error) {
	cardConfig := protoCardConfigToDomain(req.Msg.CardConfig)

	result, err := h.service.CreateRoom(ctx, req.Msg.HostName, req.Msg.SessionToken, cardConfig)
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
	result, err := h.service.JoinRoom(ctx, req.Msg.RoomId, req.Msg.ParticipantName, req.Msg.SessionToken, req.Msg.IsSpectator)
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

// KickParticipant removes a participant from the room (host only)
func (h *RoomHandler) KickParticipant(
	ctx context.Context,
	req *connect.Request[esteemedv1.KickParticipantRequest],
) (*connect.Response[esteemedv1.KickParticipantResponse], error) {
	err := h.service.KickParticipant(ctx, req.Msg.RoomId, req.Msg.ParticipantId, req.Msg.SessionToken, req.Msg.TargetParticipantId)
	if err != nil {
		if err == domain.ErrRoomNotFound {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		if err == domain.ErrInvalidToken {
			return nil, connect.NewError(connect.CodePermissionDenied, err)
		}
		if err == domain.ErrNotHost {
			return nil, connect.NewError(connect.CodePermissionDenied, err)
		}
		if err == domain.ErrCannotKickSelf {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		if err == domain.ErrParticipantNotFound {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&esteemedv1.KickParticipantResponse{}), nil
}

// TransferOwnership transfers host privileges to another participant
func (h *RoomHandler) TransferOwnership(
	ctx context.Context,
	req *connect.Request[esteemedv1.TransferOwnershipRequest],
) (*connect.Response[esteemedv1.TransferOwnershipResponse], error) {
	err := h.service.TransferOwnership(ctx, req.Msg.RoomId, req.Msg.ParticipantId, req.Msg.SessionToken, req.Msg.NewHostId)
	if err != nil {
		if err == domain.ErrRoomNotFound {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		if err == domain.ErrInvalidToken {
			return nil, connect.NewError(connect.CodePermissionDenied, err)
		}
		if err == domain.ErrNotHost {
			return nil, connect.NewError(connect.CodePermissionDenied, err)
		}
		if err == domain.ErrCannotTransferToSpectator {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		if err == domain.ErrParticipantNotFound {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&esteemedv1.TransferOwnershipResponse{}), nil
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
			IsSpectator: p.IsSpectator,
		})
	}

	return &esteemedv1.Room{
		Id:           room.ID,
		Name:         room.Name,
		Participants: participants,
		State:        domainStateToProto(room.GetState()),
		CreatedAt:    room.CreatedAt.Unix(),
		CardConfig:   domainCardConfigToProto(room.CardConfig),
	}
}

func protoCardConfigToDomain(config *esteemedv1.CardConfig) *domain.CardConfig {
	if config == nil {
		return nil
	}

	preset := protoPresetToDomain(config.Preset)

	// For non-custom presets, use the preset cards
	if preset != domain.CardPresetCustom {
		return domain.NewCardConfig(preset)
	}

	// For custom preset, use the provided cards
	cards := make([]*domain.Card, 0, len(config.Cards))
	for _, c := range config.Cards {
		cards = append(cards, &domain.Card{
			Value:        c.Value,
			NumericValue: int(c.NumericValue),
			IsNumeric:    c.IsNumeric,
		})
	}

	return domain.NewCustomCardConfig(cards)
}

func domainCardConfigToProto(config *domain.CardConfig) *esteemedv1.CardConfig {
	if config == nil {
		config = domain.DefaultCardConfig()
	}

	cards := make([]*esteemedv1.Card, 0, len(config.Cards))
	for _, c := range config.Cards {
		cards = append(cards, &esteemedv1.Card{
			Value:        c.Value,
			NumericValue: int32(c.NumericValue),
			IsNumeric:    c.IsNumeric,
		})
	}

	return &esteemedv1.CardConfig{
		Preset: domainPresetToProto(config.Preset),
		Cards:  cards,
	}
}

func protoPresetToDomain(preset esteemedv1.CardPreset) domain.CardPreset {
	switch preset {
	case esteemedv1.CardPreset_CARD_PRESET_FIBONACCI:
		return domain.CardPresetFibonacci
	case esteemedv1.CardPreset_CARD_PRESET_MODIFIED_FIBONACCI:
		return domain.CardPresetModifiedFibonacci
	case esteemedv1.CardPreset_CARD_PRESET_TSHIRT:
		return domain.CardPresetTShirt
	case esteemedv1.CardPreset_CARD_PRESET_POWERS_OF_TWO:
		return domain.CardPresetPowersOfTwo
	case esteemedv1.CardPreset_CARD_PRESET_LINEAR:
		return domain.CardPresetLinear
	case esteemedv1.CardPreset_CARD_PRESET_CUSTOM:
		return domain.CardPresetCustom
	default:
		return domain.CardPresetFibonacci
	}
}

func domainPresetToProto(preset domain.CardPreset) esteemedv1.CardPreset {
	switch preset {
	case domain.CardPresetFibonacci:
		return esteemedv1.CardPreset_CARD_PRESET_FIBONACCI
	case domain.CardPresetModifiedFibonacci:
		return esteemedv1.CardPreset_CARD_PRESET_MODIFIED_FIBONACCI
	case domain.CardPresetTShirt:
		return esteemedv1.CardPreset_CARD_PRESET_TSHIRT
	case domain.CardPresetPowersOfTwo:
		return esteemedv1.CardPreset_CARD_PRESET_POWERS_OF_TWO
	case domain.CardPresetLinear:
		return esteemedv1.CardPreset_CARD_PRESET_LINEAR
	case domain.CardPresetCustom:
		return esteemedv1.CardPreset_CARD_PRESET_CUSTOM
	default:
		return esteemedv1.CardPreset_CARD_PRESET_FIBONACCI
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
					IsSpectator: event.Participant.IsSpectator,
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
	case primary.RoomEventClosed:
		protoEvent.Event = &esteemedv1.RoomEvent_RoomClosed{
			RoomClosed: &esteemedv1.RoomClosed{
				Reason: event.Reason,
			},
		}
	case primary.RoomEventHostChanged:
		protoEvent.Event = &esteemedv1.RoomEvent_HostChanged{
			HostChanged: &esteemedv1.HostChanged{
				NewHostId: event.NewHostID,
			},
		}
	}

	return protoEvent
}
