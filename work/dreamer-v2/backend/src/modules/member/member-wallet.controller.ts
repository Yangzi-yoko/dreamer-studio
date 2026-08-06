import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { MemberWalletService } from './member-wallet.service';
import { toYuan } from '../../common/utils/money.utils';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('member/wallet')
export class MemberWalletController {
  constructor(private readonly walletService: MemberWalletService) {}

  @Get(':memberId')
  @Permissions('member:wallet:list')
  async detail(@Param('memberId', ParseIntPipe) memberId: number, @Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    const wallet = await this.walletService.getOrCreate(memberId);
    const logs = await this.walletService.page(memberId, Number(page), Number(pageSize));
    return {
      account: { memberId, balance: toYuan(wallet.balanceCents) },
      logs: logs.list.map((l) => ({ ...l, amount: toYuan(l.amountCents), balanceAfter: toYuan(l.balanceAfterCents) })),
      total: logs.total,
    };
  }

  @Post(':memberId/recharge')
  @Permissions('member:wallet:list')
  recharge(@Param('memberId', ParseIntPipe) memberId: number, @Body() dto: { amountYuan: number; remark?: string }) {
    return this.walletService.recharge(memberId, Math.round(dto.amountYuan * 100), dto.remark);
  }

  @Post(':memberId/deduct')
  @Permissions('member:wallet:list')
  deduct(@Param('memberId', ParseIntPipe) memberId: number, @Body() dto: { amountYuan: number; remark?: string }) {
    return this.walletService.deduct(memberId, Math.round(dto.amountYuan * 100), dto.remark);
  }

  @Post(':memberId/refund')
  @Permissions('member:wallet:list')
  refund(@Param('memberId', ParseIntPipe) memberId: number, @Body() dto: { amountYuan: number; remark?: string }) {
    return this.walletService.refund(memberId, Math.round(dto.amountYuan * 100), dto.remark);
  }
}
