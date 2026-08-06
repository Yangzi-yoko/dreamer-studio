import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { StudioService } from './studio.service';
import { SaveStudioDto } from './dto/save-studio.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('rental/studios')
export class StudioController {
  constructor(private readonly studioService: StudioService) {}

  @Get()
  @Permissions('rental:studio:list')
  page(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.studioService.page(Number(page), Number(pageSize));
  }

  @Get(':id')
  @Permissions('rental:studio:list')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.studioService.findOne(id);
  }

  @Post()
  @Permissions('rental:studio:create')
  create(@Body() dto: SaveStudioDto) {
    return this.studioService.create(dto);
  }

  @Put(':id')
  @Permissions('rental:studio:update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: SaveStudioDto) {
    return this.studioService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('rental:studio:delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.studioService.remove(id);
    return { id };
  }
}
