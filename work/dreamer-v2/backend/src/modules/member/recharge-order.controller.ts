import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { MemberAuthGuard } from '../member-auth/member-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { CurrentMember, CurrentMemberPayload } from '../member-auth/current-member.decorator';
import { RechargeOrderService } from './recharge-order.service';

@Controller('member/recharge-orders')
export class RechargeOrderController {
  constructor(private readonly rechargeService: RechargeOrderService) {}

  @UseGuards(MemberAuthGuard)
  @Post('me')
  create(@CurrentMember() member: CurrentMemberPayload, @Body() dto: { amountYuan: number; remark?: string }) {
    return this.rechargeService.create(member.memberId, Math.round(Number(dto.amountYuan) * 100), dto.remark);
  }

  @UseGuards(MemberAuthGuard)
  @Get('me')
  mine(@CurrentMember() member: CurrentMemberPayload) {
    return this.rechargeService.mine(member.memberId);
  }

  @UseGuards(MemberAuthGuard)
  @Post('me/:id/pay')
  pay(@CurrentMember() member: CurrentMemberPayload, @Param('id', ParseIntPipe) id: number) {
    return this.rechargeService.pay(member.memberId, id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('member:recharge:list')
  @Get()
  page(@Query('page') page = 1, @Query('pageSize') pageSize = 10, @Query('status') status?: string) {
    return this.rechargeService.page(Number(page), Number(pageSize), status);
  }

  // 预留支付确认接口：线下/第三方支付到账后由后台确认入账
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/pay')
  adminPay(@Param('id', ParseIntPipe) id: number) {
    return this.rechargeService.adminPay(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/cancel')
  adminCancel(@Param('id', ParseIntPipe) id: number) {
    return this.rechargeService.cancel(id);
  }
}
