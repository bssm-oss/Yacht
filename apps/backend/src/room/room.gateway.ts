import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomService } from './room.service';

@WebSocketGateway({ cors: { origin: 'https://web-yacht-front-moi1ut3j59ddc723.sel3.cloudtype.app', credentials: true }, namespace: '/' })
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
    const result = this.roomService.joinRoom(data.roomId, data.playerName, client.id);
    if (!result) {
      client.emit('room:error', { message: 'Room not found or full' });
      return;
    }

    // Always join the socket.io room so spectators also get future game:state events
    client.join(data.roomId);

    if ('spectating' in result) {
      client.emit('room:spectating', { gameState: result.state });
      return;
    }

    this.server.to(data.roomId).emit('game:state', result);
    client.emit('room:joined', { gameState: result });
  }

  @SubscribeMessage('room:ready')
  handleReady(
    @MessageBody() data: { ready: boolean },
    @ConnectedSocket() client: Socket
  ) {
    const result = this.roomService.setReady(client.id, data.ready);
    if (result) {
      this.server.to(result.roomId).emit('game:state', result.state);
    }
  }

  @SubscribeMessage('room:start')
  handleStart(
    @ConnectedSocket() client: Socket
  ) {
    const result = this.roomService.startGame(client.id);
    if (!result) {
      client.emit('room:error', { message: '모든 플레이어가 준비해야 시작할 수 있습니다.' });
      return;
    }
    this.server.to(result.roomId).emit('game:state', result.state);
  }

  handleDisconnect(client: Socket) {
    this.roomService.removeSpectator(client.id);
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

  @SubscribeMessage('chat:message')
  handleChat(
    @MessageBody() data: { roomId: string; message: string },
    @ConnectedSocket() client: Socket
  ) {
    const state = this.roomService.getRoom(data.roomId);
    if (!state) return;
    const player = state.players.find((p) => p.id === client.id);
    const playerName = player?.name ?? '관전자';
    this.server.to(data.roomId).emit('chat:message', {
      playerId: client.id,
      playerName,
      message: data.message.slice(0, 200),
      timestamp: Date.now(),
    });
  }
}
