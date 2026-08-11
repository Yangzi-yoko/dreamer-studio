import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { MemberAuthGuard } from '../member-auth/member-auth.guard';
import { CurrentMember, CurrentMemberPayload } from '../member-auth/current-member.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { MemberReferralService } from './member-referral.service';
import { BusinessException } from '../../common/exceptions/business.exception';

class BindDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  code!: string;
}

@Controller('member/referral')
export class MemberReferralController {
  constructor(private readonly referralService: MemberReferralService) {}

  @UseGuards(MemberAuthGuard)
  @Get('code/:memberId')
  code(@Param('memberId', ParseIntPipe) memberId: number, @CurrentMember() member: CurrentMemberPayload) {
    if (member.memberId !== memberId) throw new BusinessException('无权查看其他会员的邀请码', 40300);
    return this.referralService.getMyCode(memberId);
  }

  @UseGuards(MemberAuthGuard)
  @Post('bind')
  bind(@Body() dto: BindDto, @CurrentMember() member: CurrentMemberPayload) {
    return this.referralService.bind(member.memberId, dto.code);
  }

  @UseGuards(MemberAuthGuard)
  @Get('me')
  me(@CurrentMember() member: CurrentMemberPayload) {
    return this.referralService.summary(member.memberId);
  }

  @UseGuards(MemberAuthGuard)
  @Get('me/team')
  team(@CurrentMember() member: CurrentMemberPayload, @Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.referralService.team(member.memberId, Number(page), Number(pageSize));
  }

  @UseGuards(MemberAuthGuard)
  @Get('me/rewards')
  myRewards(@CurrentMember() member: CurrentMemberPayload, @Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.referralService.pageRewards(member.memberId, Number(page), Number(pageSize));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('settle')
  @Permissions('member:referral:list')
  settle(@Body() dto: { referrerMemberId: number; inviteeMemberId: number; orderNo: string; amountYuan: number }) {
    return this.referralService.settle(dto.referrerMemberId, dto.inviteeMemberId, dto.orderNo, Math.round(dto.amountYuan * 100));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('relations')
  @Permissions('member:referral:list')
  relations(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.referralService.pageAllRelations(Number(page), Number(pageSize));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('rewards')
  @Permissions('member:referral:list')
  allRewards(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.referralService.pageAllRewards(Number(page), Number(pageSize));
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