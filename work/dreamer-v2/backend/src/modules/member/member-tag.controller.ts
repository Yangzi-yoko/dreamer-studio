import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { MemberTagService } from './member-tag.service';
import { MemberTag } from './entities/member-tag.entity';
import { BaseController } from '../../common/base/base.controller';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('member/tags')
export class MemberTagController extends BaseController<MemberTag> {
  constructor(private readonly tagService: MemberTagService) {
    super(tagService);
  }
}
