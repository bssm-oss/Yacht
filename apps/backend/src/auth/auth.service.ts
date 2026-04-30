import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { UserProfile, JwtPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async login(user: UserProfile): Promise<{ accessToken: string; user: UserProfile }> {
    // Upsert user in DB on Google login
    const dbUser = await this.prisma.user.upsert({
      where: { googleId: user.id },
      update: {
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
      create: {
        googleId: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      dbId: dbUser.id,
    };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken, user };
  }
}
