import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto.email, dto.password, req.ip);
  }

  /** One-shot bootstrap: creates demo org/clinic + MASTER user. Idempotent + locked once MASTER exists. */
  @Post('bootstrap')
  bootstrap(
    @Body() dto: { email?: string; password?: string; secret?: string } | undefined,
    @Req() req: Request,
  ) {
    return this.authService.bootstrap(dto, req.ip);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  logout(@CurrentUser() user: RequestUser) {
    return this.authService.logout(user.sub, user.session_id, user.clinic_id);
  }
}
