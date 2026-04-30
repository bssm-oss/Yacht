import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import type { UserProfile } from './auth.types';

const FRONTEND_URL =
  process.env.FRONTEND_URL ??
  'https://web-yacht-front-moi1ut3j59ddc723.sel3.cloudtype.app';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Google OAuth 로그인 진입점 */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    // Passport가 Google 로그인 페이지로 자동 리다이렉트
  }

  /** Google OAuth 콜백 */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request & { user: UserProfile }, @Res() res: Response) {
    const { accessToken, user } = await this.authService.login(req.user);

    // 프론트엔드로 토큰 전달 (URL fragment 방식)
    const encoded = encodeURIComponent(JSON.stringify({ accessToken, user }));
    return res.redirect(`${FRONTEND_URL}/auth/callback#token=${encoded}`);
  }

  /** JWT 검증 – 현재 로그인 유저 반환 */
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMe(@Req() req: Request & { user: UserProfile }) {
    return req.user;
  }
}
