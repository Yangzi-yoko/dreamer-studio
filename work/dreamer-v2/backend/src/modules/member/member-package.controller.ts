import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { MemberPackageService } from './member-package.service';
import { SavePackageCardDto } from './dto/save-package-card.dto';
import { BusinessException } from '../../common/exceptions/business.exception';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('member/packages')
export class MemberPackageController {
  constructor(private readonly packageService: MemberPackageService) {}

  @Get()
  @Permissions('member:package:list')
  page(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.packageService.pageCards(Number(page), Number(pageSize));
  }

  @Get('users')
  @Permissions('member:package:list')
  users(@Query('memberId', ParseIntPipe) memberId: number) {
    return this.packageService.pageUserPackages(memberId);
  }

  @Post()
  @Permissions('member:package:create')
  create(@Body() dto: SavePackageCardDto) {
    return this.packageService.createCard(dto);
  }

  @Put(':id')
  @Permissions('member:package:update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: SavePackageCardDto) {
    return this.packageService.updateCard(id, dto);
  }

  @Delete(':id')
  @Permissions('member:package:delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.packageService.deleteCard(id);
    return { id };
  }

  @Post(':packageId/buy')
  @Permissions('member:package:list')
  buy(@Param('packageId', ParseIntPipe) packageId: number, @Body() dto: { memberId: number }) {
    return this.packageService.buy(dto.memberId, packageId);
  }

  @Post('users/:userPackageId/use')
  @Permissions('member:package:list')
  use(@Param('userPackageId', ParseIntPipe) userPackageId: number, @Body() dto: { memberId: number; minutes?: number; remark?: string }) {
    if (!dto?.memberId) throw new BusinessException('缺少会员ID', 40030);
    return this.packageService.useMinutes(dto.memberId, userPackageId, dto.minutes || 60, dto.remark);
  }
}
