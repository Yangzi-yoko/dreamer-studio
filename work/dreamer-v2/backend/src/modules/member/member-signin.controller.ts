import { Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { MemberAuthGuard } from '../member-auth/member-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { CurrentMember, CurrentMemberPayload } from '../member-auth/current-member.decorator';
import { MemberSigninService } from './member-signin.service';

@Controller('member/signin')
export class MemberSigninController {
  constructor(private readonly signinService: MemberSigninService) {}

  @UseGuards(MemberAuthGuard)
  @Post('checkin')
  checkin(@CurrentMember() member: CurrentMemberPayload) {
    return this.signinService.checkin(member.memberId);
  }

  @UseGuards(MemberAuthGuard)
  @Get('status')
  status(@CurrentMember() member: CurrentMemberPayload) {
    return this.signinService.status(member.memberId);
  }

  @UseGuards(MemberAuthGuard)
  @Get('me')
  page(@CurrentMember() member: CurrentMemberPayload, @Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.signinService.page(member.memberId, Number(page), Number(pageSize));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('member:signin:list')
  @Get('admin/:memberId')
  adminPage(@Param('memberId', ParseIntPipe) memberId: number, @Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.signinService.page(memberId, Number(page), Number(pageSize));
  }
}