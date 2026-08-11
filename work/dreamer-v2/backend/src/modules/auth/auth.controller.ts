import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentAdmin, CurrentAdminPayload } from './current-admin.decorator';
import { AdminService } from '../system/admin.service';
import { ThrottleGuard } from '../../common/throttle/throttle.guard';
import { Throttle } from '../../common/throttle/throttle.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly adminService: AdminService,
  ) {}

  @UseGuards(ThrottleGuard)
  @Throttle({ limit: 30, windowSeconds: 60 })
  @Post('login')
  login(@Body() dto: LoginDto, @Headers('x-forwarded-for') forwarded: string): Promise<{ accessToken: string; admin: any }> {
    const ip = (forwarded || '').split(',')[0].trim() || undefined;
    return this.authService.login(dto.username, dto.password, ip);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@CurrentAdmin() admin: CurrentAdminPayload): CurrentAdminPayload {
    return admin;
  }

  @UseGuards(JwtAuthGuard)
  @Get('menus')
  menus(@CurrentAdmin() admin: CurrentAdminPayload) {
    return this.adminService.menusOf(admin.adminId);
  }
}