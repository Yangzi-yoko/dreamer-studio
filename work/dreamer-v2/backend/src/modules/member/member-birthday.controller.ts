import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { MemberBirthdayService } from './member-birthday.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('member/birthday')
export class MemberBirthdayController {
  constructor(private readonly birthdayService: MemberBirthdayService) {}

  @Get('config')
  @Permissions('member:birthday:list')
  getConfig() {
    return this.birthdayService.getConfig();
  }

  @Put('config')
  @Permissions('member:birthday:update')
  updateConfig(@Body() dto: { couponId: number; enabled: boolean }) {
    return this.birthdayService.updateConfig(dto);
  }

  @Post('run-now')
  @Permissions('member:birthday:update')
  runNow() {
    return this.birthdayService.runDaily(new Date().toISOString().slice(5, 10));
  }
}
