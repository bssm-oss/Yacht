import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameGateway } from './game.gateway';
import { RoomModule } from '../room/room.module';

@Module({
  imports: [RoomModule],
  providers: [GameService, GameGateway],
})
export class GameModule {}
