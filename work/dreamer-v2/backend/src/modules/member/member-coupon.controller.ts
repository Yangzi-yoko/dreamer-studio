import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { MemberAuthGuard } from '../member-auth/member-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { MemberCouponService } from './member-coupon.service';
import { SaveCouponDto } from './dto/save-coupon.dto';
import { BusinessException } from '../../common/exceptions/business.exception';
import { CurrentMember, CurrentMemberPayload } from '../member-auth/current-member.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('member/coupons')
export class MemberCouponController {
  constructor(private readonly couponService: MemberCouponService) {}

  @Get()
  @Permissions('member:coupon:list')
  page(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.couponService.pageCoupons(Number(page), Number(pageSize));
  }

  @Get('users')
  @Permissions('member:coupon:list')
  users(@Query('memberId', ParseIntPipe) memberId: number) {
    return this.couponService.pageUserCoupons(memberId);
  }

  @UseGuards(MemberAuthGuard)
  @Get('mine')
  mine(@CurrentMember() member: CurrentMemberPayload) {
    return this.couponService.pageUserCoupons(member.memberId);
  }

  @Post()
  @Permissions('member:coupon:create')
  create(@Body() dto: SaveCouponDto) {
    return this.couponService.createCoupon(dto);
  }

  @Put(':id')
  @Permissions('member:coupon:update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: SaveCouponDto) {
    return this.couponService.updateCoupon(id, dto);
  }

  @Delete(':id')
  @Permissions('member:coupon:delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.couponService.deleteCoupon(id);
    return { id };
  }

  @Post(':couponId/issue')
  @Permissions('member:coupon:issue')
  issue(@Param('couponId', ParseIntPipe) couponId: number, @Body() dto: { memberId: number }) {
    return this.couponService.issue(dto.memberId, couponId);
  }

  @Post('users/:userCouponId/use')
  @Permissions('member:coupon:list')
  use(@Param('userCouponId', ParseIntPipe) userCouponId: number, @Body() dto: { memberId: number; orderNo: string; amountYuan: number }) {
    if (!dto?.memberId) throw new BusinessException('缺少会员ID', 40030);
    if (!dto?.orderNo) throw new BusinessException('缺少订单号', 40030);
    if (typeof dto?.amountYuan !== 'number' || dto.amountYuan <= 0) throw new BusinessException('缺少有效金额', 40030);
    return this.couponService.use(dto.memberId, userCouponId, dto.orderNo, Math.round(dto.amountYuan * 100));
  }
}
