import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from './entities/member.entity';
import { MemberLevel } from './entities/member-level.entity';
import { MemberTag } from './entities/member-tag.entity';
import { MemberService } from './member.service';
import { MemberController } from './member.controller';
import { MemberLevelService } from './member-level.service';
import { MemberLevelController } from './member-level.controller';
import { MemberTagService } from './member-tag.service';
import { MemberTagController } from './member-tag.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Member, MemberLevel, MemberTag])],
  controllers: [MemberController, MemberLevelController, MemberTagController],
  providers: [MemberService, MemberLevelService, MemberTagService],
  exports: [MemberService],
})
export class MemberModule {}
