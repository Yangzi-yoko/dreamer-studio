import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { PointsProductService } from './points-product.service';
import { SavePointsProductDto } from './dto/save-points-product.dto';

@Controller('member/point-products')
export class PointsProductController {
  constructor(private readonly productService: PointsProductService) {}

  @Get('mall')
  mall() {
    return this.productService.mall();
  }

  @Get('mall/:id')
  mallDetail(@Param('id', ParseIntPipe) id: number) {
    return this.productService.mallDetail(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('admin')
  @Permissions('member:point-product:list')
  pageAdmin(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.productService.pageAdmin(Number(page), Number(pageSize));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  @Permissions('member:point-product:create')
  create(@Body() dto: SavePointsProductDto) {
    return this.productService.create(dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Put(':id')
  @Permissions('member:point-product:update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: SavePointsProductDto) {
    return this.productService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete(':id')
  @Permissions('member:point-product:delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productService.remove(id);
  }
}