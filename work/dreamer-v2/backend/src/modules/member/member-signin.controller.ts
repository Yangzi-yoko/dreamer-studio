import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { MemberSigninService } from './member-signin.service';

@Controller('member/signin')
export class MemberSigninController {
  constructor(private readonly signinService: MemberSigninService) {}

  @Post('checkin')
  checkin(@Body() dto: { memberId: number }) {
    return this.signinService.checkin(dto.memberId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':memberId')
  @Permissions('member:signin:list')
  page(@Param('memberId', ParseIntPipe) memberId: number, @Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.signinService.page(memberId, Number(page), Number(pageSize));
  }
}
