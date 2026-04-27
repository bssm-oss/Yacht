import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import type { Scorecard } from '@shared/types/game';

@WebSocketGateway({ cors: true, namespace: '/' })
export class GameGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly gameService: GameService) {}

  @SubscribeMessage('game:roll')
  handleRoll(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket
  ) {
    const state = this.gameService.roll(data.roomId, client.id);
    if (state) {
      this.server.to(data.roomId).emit('game:state', state);
    }
  }

  @SubscribeMessage('game:hold')
  handleHold(
    @MessageBody() data: { roomId: string; index: number },
    @ConnectedSocket() client: Socket
  ) {
    const state = this.gameService.hold(data.roomId, client.id, data.index);
    if (state) {
      this.server.to(data.roomId).emit('game:state', state);
    }
  }

  @SubscribeMessage('game:pick')
  handlePick(
    @MessageBody() data: { roomId: string; categoryId: keyof Scorecard },
    @ConnectedSocket() client: Socket
  ) {
    const state = this.gameService.pickCategory(data.roomId, client.id, data.categoryId);
    if (state) {
      this.server.to(data.roomId).emit('game:state', state);
    }
  }
}
