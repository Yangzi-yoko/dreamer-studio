import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { MemberReferralService } from './member-referral.service';

@Controller('member/referral')
export class MemberReferralController {
  constructor(private readonly referralService: MemberReferralService) {}

  @Get('code/:memberId')
  code(@Param('memberId', ParseIntPipe) memberId: number) {
    return this.referralService.getMyCode(memberId);
  }

  @Post('bind')
  bind(@Body() dto: { inviteeMemberId: number; code: string }) {
    return this.referralService.bind(dto.inviteeMemberId, dto.code);
  }

  @Post('settle')
  settle(@Body() dto: { referrerMemberId: number; inviteeMemberId: number; orderNo: string; amountYuan: number }) {
    return this.referralService.settle(dto.referrerMemberId, dto.inviteeMemberId, dto.orderNo, Math.round(dto.amountYuan * 100));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('rewards/:memberId')
  @Permissions('member:referral:list')
  rewards(@Param('memberId', ParseIntPipe) memberId: number, @Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.referralService.pageRewards(memberId, Number(page), Number(pageSize));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('rule')
  @Permissions('member:referral:rule')
  getRule() {
    return this.referralService.getRule();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Put('rule')
  @Permissions('member:referral:rule')
  updateRule(@Body() dto: { percent: number; fixedCents: number; enabled: boolean }) {
    return this.referralService.updateRule(dto);
  }
}
