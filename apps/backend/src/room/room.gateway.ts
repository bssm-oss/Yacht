import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomService } from './room.service';

@WebSocketGateway({ cors: true, namespace: '/' })
export class RoomGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly roomService: RoomService) {}

  @SubscribeMessage('room:create')
  handleCreate(
    @MessageBody() data: { playerName: string; maxPlayers?: number; isPublic?: boolean },
    @ConnectedSocket() client: Socket
  ) {
    const maxPlayers = data.maxPlayers ?? 4;
    const isPublic = data.isPublic ?? true;
    const state = this.roomService.createRoom(data.playerName, client.id, maxPlayers, isPublic);
    client.join(state.roomId);
    client.emit('room:created', { roomId: state.roomId, gameState: state });
  }

  @SubscribeMessage('room:join')
  handleJoin(
    @MessageBody() data: { roomId: string; playerName: string },
    @ConnectedSocket() client: Socket
  ) {
    const state = this.roomService.joinRoom(data.roomId, data.playerName, client.id);
    if (!state) {
      client.emit('room:error', { message: 'Room not found or full' });
      return;
    }
    client.join(data.roomId);
    this.server.to(data.roomId).emit('game:state', state);
    client.emit('room:joined', { gameState: state });
  }

  handleDisconnect(client: Socket) {
    const result = this.roomService.removePlayer(client.id);
    if (result) {
      this.server.to(result.roomId).emit('game:state', result.state);
    }
  }

  @SubscribeMessage('room:list')
  handleList(@ConnectedSocket() client: Socket) {
    const rooms = this.roomService.getPublicRooms();
    client.emit('room:list', { rooms });
  }
}
