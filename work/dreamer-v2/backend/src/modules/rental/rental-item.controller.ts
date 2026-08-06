import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { RentalItemService } from './rental-item.service';
import { SaveRentalItemDto } from './dto/save-rental-item.dto';

@Controller('rental/items')
export class RentalItemController {
  constructor(private readonly itemService: RentalItemService) {}

  @Get()
  page(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.itemService.page(Number(page), Number(pageSize));
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.itemService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  @Permissions('rental:item:create')
  create(@Body() dto: SaveRentalItemDto) {
    return this.itemService.create(dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Put(':id')
  @Permissions('rental:item:update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: SaveRentalItemDto) {
    return this.itemService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete(':id')
  @Permissions('rental:item:delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.itemService.remove(id);
    return { id };
  }
}
