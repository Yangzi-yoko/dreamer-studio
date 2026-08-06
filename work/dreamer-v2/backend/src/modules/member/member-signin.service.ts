import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { formatDate, parseDate } from '../../common/utils/date.utils';
import { MemberPointsService } from './member-points.service';
import { SigninLog } from './entities/signin-log.entity';

const BASE_POINTS = 10;
const STREAK_BONUS = 50;
const BONUS_STREAK = 7;

@Injectable()
export class MemberSigninService {
  constructor(
    @InjectRepository(SigninLog) private readonly logRepo: Repository<SigninLog>,
    private readonly pointsService: MemberPointsService,
  ) {}

  async checkin(memberId: number): Promise<SigninLog> {
    const today = formatDate(new Date());
    const exists = await this.logRepo.findOneBy({ memberId, signinDate: today });
    if (exists) throw new BusinessException('今日已签到', 40051);

    const yesterday = formatDate(new Date(parseDate(today).getTime() - 86400000));
    const yestLog = await this.logRepo.findOneBy({ memberId, signinDate: yesterday });
    const streak = yestLog ? yestLog.streak + 1 : 1;
    const pointsAwarded = BASE_POINTS + (streak % BONUS_STREAK === 0 ? STREAK_BONUS : 0);

    const saved = await this.logRepo.save(this.logRepo.create({
      memberId, signinDate: today, streak, pointsAwarded,
    }));
    await this.pointsService.earn(memberId, pointsAwarded, `签到奖励(${streak}天)`);
    return saved;
  }

  async page(memberId: number, page = 1, pageSize = 10): Promise<{ list: SigninLog[]; total: number; page: number; pageSize: number }> {
    const [list, total] = await this.logRepo.findAndCount({
      where: { memberId },
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { signinDate: 'DESC' },
    });
    return { list, total, page, pageSize };
  }
}
