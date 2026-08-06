import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../common/base/base.service';
import { MemberTag } from './entities/member-tag.entity';

@Injectable()
export class MemberTagService extends BaseService<MemberTag> {
  constructor(@InjectRepository(MemberTag) repo: Repository<MemberTag>) {
    super(repo);
  }
}
