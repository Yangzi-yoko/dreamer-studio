import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { MemberAuthGuard } from '../member-auth/member-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { CurrentMember, CurrentMemberPayload } from '../member-auth/current-member.decorator';
import { MemberPointsService } from './member-points.service';

@Controller('member/points')
export class MemberPointsController {
  constructor(private readonly pointsService: MemberPointsService) {}

  @UseGuards(MemberAuthGuard)
  @Get('me')
  async myDetail(@CurrentMember() member: CurrentMemberPayload, @Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.detail(member.memberId, page, pageSize);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('member:points:list')
  @Get(':memberId')
  async detail(@Param('memberId', ParseIntPipe) memberId: number, @Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    const account = await this.pointsService.getOrCreate(memberId);
    const logs = await this.pointsService.page(memberId, Number(page), Number(pageSize));
    return { account: { memberId, balance: account.balance }, logs };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':memberId/earn')
  earn(@Param('memberId', ParseIntPipe) memberId: number, @Body() dto: { points: number; remark?: string }) {
    return this.pointsService.earn(memberId, dto.points, dto.remark);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':memberId/spend')
  spend(@Param('memberId', ParseIntPipe) memberId: number, @Body() dto: { points: number; remark?: string }) {
    return this.pointsService.spend(memberId, dto.points, dto.remark);
  }
}
