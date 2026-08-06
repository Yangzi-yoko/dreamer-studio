import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { MemberCouponService } from './member-coupon.service';
import { SaveCouponDto } from './dto/save-coupon.dto';

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
    return this.couponService.use(dto.memberId, userCouponId, dto.orderNo, Math.round(dto.amountYuan * 100));
  }
}
