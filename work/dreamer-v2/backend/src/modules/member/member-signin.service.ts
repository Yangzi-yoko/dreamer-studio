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

  async status(memberId: number): Promise<{
    todaySigned: boolean;
    currentStreak: number;
    basePoints: number;
    streakBonus: number;
    bonusStreak: number;
    daysToBonus: number;
    monthDays: string[];
    totalDays: number;
    points: number;
  }> {
    const today = formatDate(new Date());
    const todayLog = await this.logRepo.findOneBy({ memberId, signinDate: today });
    const yesterday = formatDate(new Date(parseDate(today).getTime() - 86400000));
    const yestLog = await this.logRepo.findOneBy({ memberId, signinDate: yesterday });

    let currentStreak = 0;
    if (todayLog) {
      currentStreak = todayLog.streak;
    } else if (yestLog) {
      currentStreak = yestLog.streak;
    }
    if (currentStreak === 0) {
      const allLogs = await this.logRepo.find({
        where: { memberId },
        order: { signinDate: 'DESC' },
        take: 1,
      });
      if (allLogs.length) currentStreak = allLogs[0].streak;
    }

    const totalDays = await this.logRepo.countBy({ memberId });
    const monthPrefix = today.slice(0, 7);
    const monthLogs = await this.logRepo.find({
      where: { memberId },
      order: { signinDate: 'ASC' },
    });
    const monthDays = monthLogs
      .filter((l) => l.signinDate.startsWith(monthPrefix))
      .map((l) => l.signinDate);

    const nextStreak = (todayLog ? todayLog.streak : currentStreak) + 1;
    const daysToBonus = BONUS_STREAK - (nextStreak % BONUS_STREAK);

    let points = 0;
    try {
      const acct = await this.pointsService.getOrCreate(memberId);
      points = acct.balance;
    } catch {}

    return {
      todaySigned: !!todayLog,
      currentStreak,
      basePoints: BASE_POINTS,
      streakBonus: STREAK_BONUS,
      bonusStreak: BONUS_STREAK,
      daysToBonus,
      monthDays,
      totalDays,
      points,
    };
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