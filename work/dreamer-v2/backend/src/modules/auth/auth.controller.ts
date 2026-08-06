import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentAdmin, CurrentAdminPayload } from './current-admin.decorator';
import { AdminService } from '../system/admin.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly adminService: AdminService,
  ) {}

  @Post('login')
  login(@Body() dto: LoginDto): Promise<{ accessToken: string; admin: any }> {
    return this.authService.login(dto.username, dto.password);
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
