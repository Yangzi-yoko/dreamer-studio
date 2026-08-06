import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { MemberAuthGuard } from '../member-auth/member-auth.guard';
import { MemberWalletService } from './member-wallet.service';
import { toYuan } from '../../common/utils/money.utils';

@UseGuards(MemberAuthGuard)
@Controller('member/wallet')
export class MemberWalletController {
  constructor(private readonly walletService: MemberWalletService) {}

  @Get(':memberId')
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
  recharge(@Param('memberId', ParseIntPipe) memberId: number, @Body() dto: { amountYuan: number; remark?: string }) {
    return this.walletService.recharge(memberId, Math.round(dto.amountYuan * 100), dto.remark);
  }

  @Post(':memberId/deduct')
  deduct(@Param('memberId', ParseIntPipe) memberId: number, @Body() dto: { amountYuan: number; remark?: string }) {
    return this.walletService.deduct(memberId, Math.round(dto.amountYuan * 100), dto.remark);
  }

  @Post(':memberId/refund')
  refund(@Param('memberId', ParseIntPipe) memberId: number, @Body() dto: { amountYuan: number; remark?: string }) {
    return this.walletService.refund(memberId, Math.round(dto.amountYuan * 100), dto.remark);
  }
}
