import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { MemberPointsService } from './member-points.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('member/points')
export class MemberPointsController {
  constructor(private readonly pointsService: MemberPointsService) {}

  @Get(':memberId')
  @Permissions('member:points:list')
  async detail(@Param('memberId', ParseIntPipe) memberId: number, @Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    const account = await this.pointsService.getOrCreate(memberId);
    const logs = await this.pointsService.page(memberId, Number(page), Number(pageSize));
    return { account: { memberId, balance: account.balance }, logs };
  }

  @Post(':memberId/earn')
  @Permissions('member:points:list')
  earn(@Param('memberId', ParseIntPipe) memberId: number, @Body() dto: { points: number; remark?: string }) {
    return this.pointsService.earn(memberId, dto.points, dto.remark);
  }

  @Post(':memberId/spend')
  @Permissions('member:points:list')
  spend(@Param('memberId', ParseIntPipe) memberId: number, @Body() dto: { points: number; remark?: string }) {
    return this.pointsService.spend(memberId, dto.points, dto.remark);
  }
}
