import { Module } from '@nestjs/common';
import { RoomModule } from './room/room.module';
import { GameModule } from './game/game.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, RoomModule, GameModule, AuthModule],
})
export class AppModule {}
