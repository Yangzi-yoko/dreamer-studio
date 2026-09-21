import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { MemberAuthGuard } from '../member-auth/member-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { MemberWalletService } from './member-wallet.service';
import { toYuan } from '../../common/utils/money.utils';
import { CurrentMember, CurrentMemberPayload } from '../member-auth/current-member.decorator';
import { BusinessException } from '../../common/exceptions/business.exception';

@Controller('member/wallet')
export class MemberWalletController {
  constructor(private readonly walletService: MemberWalletService) {}

  @UseGuards(MemberAuthGuard)
  @Get('me')
  async myDetail(@CurrentMember() member: CurrentMemberPayload, @Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.detail(member.memberId, page, pageSize);
  }

  @UseGuards(MemberAuthGuard)
  @Get('me/rules')
  async myRules() {
    return this.walletService.getRechargeRules();
  }

  @UseGuards(MemberAuthGuard)
  @Post('me/recharge')
  async myRecharge(@CurrentMember() member: CurrentMemberPayload, @Body() dto: { amountYuan: number; remark?: string }) {
    const cents = Math.round(Number(dto.amountYuan) * 100);
    if (!Number.isFinite(cents) || cents <= 0) throw new BusinessException('充值金额必须大于 0', 40040);
    if (cents > 10000000) throw new BusinessException('单次充值不能超过10万元', 40042);
    const bonusCents = await this.walletService.getBonusForAmount(cents);
    return this.walletService.recharge(member.memberId, cents, bonusCents, dto.remark);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('member:wallet:list')
  @Get(':memberId')
  async detail(@Param('memberId', ParseIntPipe) memberId: number, @Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    const wallet = await this.walletService.getOrCreate(memberId);
    const logs = await this.walletService.page(memberId, Number(page), Number(pageSize));
    return {
      account: {
        memberId,
        balance: toYuan(wallet.balanceCents),
        principal: toYuan(wallet.principalCents),
        bonus: toYuan(wallet.bonusCents),
      },
      logs: logs.list.map((l) => ({
        ...l,
        amount: toYuan(l.amountCents),
        bonus: toYuan(l.bonusCents),
        balanceAfter: toYuan(l.balanceAfterCents),
      })),
      total: logs.total,
    };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('member:wallet:list')
  @Get('rules/all')
  async rules() {
    return this.walletService.getRechargeRules();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':memberId/recharge')
  recharge(@Param('memberId', ParseIntPipe) memberId: number, @Body() dto: { amountYuan: number; remark?: string }) {
    this.assertAmount(dto.amountYuan);
    return this.walletService.recharge(memberId, Math.round(dto.amountYuan * 100), 0, dto.remark);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':memberId/deduct')
  deduct(@Param('memberId', ParseIntPipe) memberId: number, @Body() dto: { amountYuan: number; remark?: string }) {
    this.assertAmount(dto.amountYuan);
    return this.walletService.deduct(memberId, Math.round(dto.amountYuan * 100), dto.remark);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':memberId/refund')
  refund(@Param('memberId', ParseIntPipe) memberId: number, @Body() dto: { amountYuan: number; remark?: string }) {
    this.assertAmount(dto.amountYuan);
    return this.walletService.refund(memberId, Math.round(dto.amountYuan * 100), dto.remark);
  }

  private assertAmount(amountYuan: number): void {
    const cents = Math.round(Number(amountYuan) * 100);
    if (!Number.isFinite(cents) || cents <= 0) throw new BusinessException('金额必须大于 0', 40040);
  }
}
