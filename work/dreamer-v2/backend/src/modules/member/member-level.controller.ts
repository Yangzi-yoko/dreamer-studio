import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { MemberLevelService } from './member-level.service';
import { SaveMemberLevelDto } from './dto/save-member-level.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('member/levels')
export class MemberLevelController {
  constructor(private readonly levelService: MemberLevelService) {}

  @Get()
  @Permissions('member:level:list')
  page(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.levelService.page(Number(page), Number(pageSize));
  }

  @Get(':id')
  @Permissions('member:level:list')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.levelService.findOne(id);
  }

  @Post()
  @Permissions('member:level:create')
  create(@Body() dto: SaveMemberLevelDto) {
    return this.levelService.create(dto);
  }

  @Put(':id')
  @Permissions('member:level:update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: SaveMemberLevelDto) {
    return this.levelService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('member:level:delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.levelService.remove(id);
    return { id };
  }
}
