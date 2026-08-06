# 会员运营域 实施计划（签到 / 生日礼遇 / 推荐返利 / 营销活动）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现会员运营四件套：每日签到（积分 + 连续签到奖励）、生日礼遇（自动发放优惠券/折扣）、推荐返利（邀请码 + 被邀请人消费后返利）、营销活动（发布/展示/报名/活动发券）。管理后台提供对应页面。

**Architecture:** 后端在 `modules/member/` 下新增：`SigninLog`（签到记录，Redis 记录今日已签）、`MemberBirthday` 字段并入 Member（birthday 列）+ 生日礼遇配置、`ReferralCode`（邀请码）+ `ReferralReward`（返利流水）、`Activity`（活动）+ `ActivityRegistration`（报名）。复用 `MemberPointsService`（签到发积分）、`MemberCouponService`（生日/活动发券）、`MemberService.addConsumption`（返利触发）。活动 H5 展示接口公开，管理接口走权限码。

**Tech Stack:** NestJS 10、TypeORM 0.3.x、MySQL 8、redis 4.x、Vue 3.4、Element Plus 2.7。

## Global Constraints

- 复用 `BusinessException`、统一响应 `{ code, message, data }`、`RedisService`
- 签到：同一会员每天最多一次（`member_signin_log` 唯一约束 `member_id + signin_date`）；连续天数按前一自然日是否签到计算；签到发积分调 `MemberPointsService.earn`
- 生日礼遇：Member 增加 `birthday`(`MM-DD`) 字段；配置表 `birthday_gift`（`couponId`、`enabled`）；每日定时任务扫描当天生日会员发券（`@nestjs/schedule`，已有 ScheduleModule）
- 推荐返利：Member 增加 `referralCode`(unique)；`referral_relation` 记录推荐关系；配置 `referral_rule`（`percent` 返利比例或 `fixedCents` 固定金额、`enabled`）；被邀请人消费后调用 `MemberService.addConsumption` 并给推荐人发储值（`MemberWalletService.refund` 语义的入账 + 返利流水 `referral_reward`）
- 营销活动：`Activity`（标题/图片/开始结束时间/规则/状态）、`ActivityRegistration`（memberId + activityId 唯一）；报名重复抛 `BusinessException('已报名', 40050)`；活动发券调 `MemberCouponService.issue`
- 权限码：`member:signin:list`、`member:birthday:list/update`、`member:referral:list/rule`、`member:activity:list/create/update/delete`
- 中文文案；接口路由 `@Controller('member/signin')`、`member/birthday`、`member/referral`、`member/activities`
- 新实体注册到 `MemberModule`；定时任务用 `@Cron`
- 管理后台新页面注册路由；侧边栏菜单来自后端种子数据

**代码根目录：** `C:\Users\97157\Documents\Codex\2026-08-06\lia\work\dreamer-v2`

---

### Task 1: 每日签到（含连续奖励）

**Files:**
- Create: `work/dreamer-v2/backend/src/modules/member/entities/signin-log.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-signin.service.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-signin.service.spec.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-signin.controller.ts`
- Modify: `work/dreamer-v2/backend/src/modules/member/member.module.ts`

**Interfaces:**
- Consumes: `MemberPointsService`、`RedisService`
- Produces:
  - `SigninLog`：`id`、`memberId`、`signinDate`(`YYYY-MM-DD`)、`streak`(连续天数)、`pointsAwarded`、`createdAt`；唯一约束 `member_id + signin_date`
  - `MemberSigninService`：`checkin(memberId)`（今日已签抛 `BusinessException('今日已签到', 40051)`；连续天数=昨日连续+1 否则 1；基础积分 10 + 连续第 7 天额外 50，规则常量化）、`page(memberId)`（签到记录）
  - `POST /api/member/signin/checkin`（body: memberId）、`GET /api/member/signin/:memberId`（权限码 `member:signin:list`）

- [ ] **Step 1: 编写失败测试**

Create `backend/src/modules/member/member-signin.service.spec.ts`:

```typescript
import { MemberSigninService } from './member-signin.service';

describe('MemberSigninService', () => {
  const logRepo: any = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn((d: any) => d),
    save: jest.fn(async (e: any) => e),
    findAndCount: jest.fn(),
  };
  const pointsService: any = { earn: jest.fn(async (_m: number, _p: number, r?: string) => ({ balance: 100 })) };
  const redis: any = { get: jest.fn().mockResolvedValue(null), set: jest.fn(), del: jest.fn() };
  const service = new MemberSigninService(logRepo, pointsService, redis);

  it('first checkin awards base points with streak 1', async () => {
    logRepo.findOne.mockResolvedValue(null);
    const res = await service.checkin(1);
    expect(res.streak).toBe(1);
    expect(res.pointsAwarded).toBe(10);
    expect(pointsService.earn).toHaveBeenCalledWith(1, 10, expect.any(String));
  });

  it('rejects duplicate checkin today', async () => {
    logRepo.findOne.mockResolvedValue({ id: 1, memberId: 1, signinDate: '2026-08-07', streak: 1, pointsAwarded: 10 });
    await expect(service.checkin(1)).rejects.toThrow('今日已签到');
  });

  it('streak 7 awards bonus', async () => {
    logRepo.findOne.mockResolvedValue({ id: 1, memberId: 1, signinDate: '2026-08-06', streak: 6, pointsAwarded: 10 });
    const res = await service.checkin(1);
    expect(res.streak).toBe(7);
    expect(res.pointsAwarded).toBe(60);
  });
});
```

Run: `npx jest src/modules/member/member-signin.service.spec.ts` — Expected: FAIL。

- [ ] **Step 2: 创建实体与服务**

Create `backend/src/modules/member/entities/signin-log.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('member_signin_log')
@Index(['memberId', 'signinDate'], { unique: true })
export class SigninLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'member_id', type: 'int' })
  memberId!: number;

  @Column({ name: 'signin_date', length: 10 })
  signinDate!: string;

  @Column({ type: 'int', default: 1 })
  streak!: number;

  @Column({ name: 'points_awarded', type: 'int', default: 0 })
  pointsAwarded!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

Create `backend/src/modules/member/member-signin.service.ts`:

```typescript
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
```

- [ ] **Step 3: 运行测试验证通过**

Run: `npx jest src/modules/member/member-signin.service.spec.ts` — Expected: PASS。

- [ ] **Step 4: 创建控制器并注册**

Create `backend/src/modules/member/member-signin.controller.ts`（checkin 公开、记录查询权限码 `member:signin:list`）。

Modify `member.module.ts`：注册 `SigninLog`、`MemberSigninService`、`MemberSigninController`。

- [ ] **Step 5: 验证构建与测试**

Run: `npm run build && npm test`
Expected: 通过。

- [ ] **Step 6: 提交**

```bash
git add work/dreamer-v2/backend/src/modules/member
git commit -m "feat: daily signin with streak rewards"
```

---

### Task 2: 生日礼遇（自动发券）

**Files:**
- Modify: `work/dreamer-v2/backend/src/modules/member/entities/member.entity.ts`（增加 `birthday` 列）
- Modify: `work/dreamer-v2/backend/src/modules/member/dto/save-member.dto.ts`（增加 birthday）
- Create: `work/dreamer-v2/backend/src/modules/member/entities/birthday-gift.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-birthday.service.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-birthday.service.spec.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-birthday.controller.ts`
- Modify: `work/dreamer-v2/backend/src/modules/member/member.module.ts`

**Interfaces:**
- Produces:
  - `Member.birthday`：`MM-DD` 字符串
  - `BirthdayGift`：`id`、`couponId`、`enabled`
  - `MemberBirthdayService`：`getConfig/updateConfig(couponId, enabled)`、`runDaily()`（`@Cron` 每天 8:00，扫描当天生日会员发券，发过的不重复——用 `birthday_gift_log` 去重）
  - `BirthdayGiftLog`：`id`、`memberId`、`couponId`、`giftDate`、`createdAt`（唯一 `memberId + couponId + giftDate`）
  - `GET/PUT /api/member/birthday/config`（权限码 `member:birthday:list/update`）

- [ ] **Step 1: 编写失败测试**

Create `backend/src/modules/member/member-birthday.service.spec.ts`:

```typescript
import { MemberBirthdayService } from './member-birthday.service';

describe('MemberBirthdayService', () => {
  const memberRepo: any = { find: jest.fn() };
  const giftRepo: any = { findOneBy: jest.fn(), create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const logRepo: any = { findOneBy: jest.fn(), create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const couponService: any = { issue: jest.fn(async (_m: number, _c: number) => ({})) };
  const service = new MemberBirthdayService(memberRepo, giftRepo, logRepo, couponService);

  it('issues coupon to birthday members once per gift date', async () => {
    giftRepo.findOneBy.mockResolvedValue({ id: 1, couponId: 1, enabled: true });
    memberRepo.find.mockResolvedValue([{ id: 1, phone: '13800000001', birthday: '08-07' }]);
    logRepo.findOneBy.mockResolvedValue(null);
    const res = await service.runDaily('08-07');
    expect(res.issued).toBe(1);
    expect(couponService.issue).toHaveBeenCalledWith(1, 1);
  });

  it('skips members already gifted today', async () => {
    giftRepo.findOneBy.mockResolvedValue({ id: 1, couponId: 1, enabled: true });
    memberRepo.find.mockResolvedValue([{ id: 1, phone: '13800000001', birthday: '08-07' }]);
    logRepo.findOneBy.mockResolvedValue({ id: 1 });
    const res = await service.runDaily('08-07');
    expect(res.issued).toBe(0);
  });
});
```

Run: `npx jest src/modules/member/member-birthday.service.spec.ts` — Expected: FAIL。

- [ ] **Step 2: 创建实体与字段**

Modify `member.entity.ts`：加 `@Column({ length: 5, nullable: true }) birthday?: string;`
Modify `save-member.dto.ts`：加 `@IsOptional() @Matches(/^\d{2}-\d{2}$/) birthday?: string;`

Create `backend/src/modules/member/entities/birthday-gift.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('birthday_gift')
export class BirthdayGift {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'coupon_id', type: 'int' })
  couponId!: number;

  @Column({ default: false })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

Create `backend/src/modules/member/entities/birthday-gift-log.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('birthday_gift_log')
@Index(['memberId', 'couponId', 'giftDate'], { unique: true })
export class BirthdayGiftLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'member_id', type: 'int' })
  memberId!: number;

  @Column({ name: 'coupon_id', type: 'int' })
  couponId!: number;

  @Column({ name: 'gift_date', length: 10 })
  giftDate!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

- [ ] **Step 3: 实现服务**

Create `backend/src/modules/member/member-birthday.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { formatDate } from '../../common/utils/date.utils';
import { Member } from './entities/member.entity';
import { BirthdayGift } from './entities/birthday-gift.entity';
import { BirthdayGiftLog } from './entities/birthday-gift-log.entity';
import { MemberCouponService } from './member-coupon.service';

@Injectable()
export class MemberBirthdayService {
  constructor(
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    @InjectRepository(BirthdayGift) private readonly giftRepo: Repository<BirthdayGift>,
    @InjectRepository(BirthdayGiftLog) private readonly logRepo: Repository<BirthdayGiftLog>,
    private readonly couponService: MemberCouponService,
  ) {}

  async getConfig(): Promise<BirthdayGift | null> {
    return this.giftRepo.findOneBy({});
  }

  async updateConfig(dto: { couponId: number; enabled: boolean }): Promise<BirthdayGift> {
    const existing = await this.giftRepo.findOneBy({});
    if (existing) {
      existing.couponId = dto.couponId;
      existing.enabled = dto.enabled;
      return this.giftRepo.save(existing);
    }
    return this.giftRepo.save(this.giftRepo.create(dto));
  }

  @Cron('0 0 8 * * *')
  async cronRun(): Promise<void> {
    await this.runDaily(formatDate(new Date()).slice(5));
  }

  async runDaily(mmdd: string): Promise<{ issued: number }> {
    const gift = await this.giftRepo.findOneBy({ enabled: true });
    if (!gift) return { issued: 0 };
    const today = formatDate(new Date());
    const members = await this.memberRepo.find({ where: { birthday: mmdd } });
    let issued = 0;
    for (const m of members) {
      const exists = await this.logRepo.findOneBy({ memberId: m.id, couponId: gift.couponId, giftDate: today });
      if (exists) continue;
      await this.couponService.issue(m.id, gift.couponId);
      await this.logRepo.save(this.logRepo.create({ memberId: m.id, couponId: gift.couponId, giftDate: today }));
      issued += 1;
    }
    return { issued };
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx jest src/modules/member/member-birthday.service.spec.ts` — Expected: PASS。

- [ ] **Step 5: 创建控制器并注册**

Create `backend/src/modules/member/member-birthday.controller.ts`（GET/PUT config，权限码 `member:birthday:list/update`；`POST run-now` 手动触发）。

Modify `member.module.ts`：注册实体与服务、控制器。

- [ ] **Step 6: 验证构建与测试**

Run: `npm run build && npm test`
Expected: 通过。

- [ ] **Step 7: 提交**

```bash
git add work/dreamer-v2/backend/src/modules/member
git commit -m "feat: birthday gift auto issue"
```

---

### Task 3: 推荐返利（邀请码 + 消费返利）

**Files:**
- Modify: `work/dreamer-v2/backend/src/modules/member/entities/member.entity.ts`（增加 `referralCode`）
- Create: `work/dreamer-v2/backend/src/modules/member/entities/referral-relation.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/entities/referral-rule.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/entities/referral-reward.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-referral.service.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-referral.service.spec.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-referral.controller.ts`
- Modify: `work/dreamer-v2/backend/src/modules/member/member.module.ts`

**Interfaces:**
- Produces:
  - `Member.referralCode`(unique)；`generateCode(memberId)` 用 `M` + 6 位随机码，重试防撞
  - `ReferralRule`：`id`、`percent`(0-100 返利比例)、`fixedCents`、`enabled`
  - `ReferralRelation`：`id`、`referrerMemberId`、`inviteeMemberId`(unique)
  - `ReferralReward`：`id`、`referrerMemberId`、`inviteeMemberId`、`orderNo`、`amountCents`、`rewardCents`、`createdAt`
  - `MemberReferralService`：`getMyCode(memberId)`、`bind(inviteeMemberId, code)`（无效码抛 `BusinessException('邀请码无效', 40052)`；已绑定抛 40053）、`settle(referrerMemberId, inviteeMemberId, orderNo, amountCents)`（按规则给推荐人发储值 + 记返利流水）、`pageRewards(memberId)`、`getRule/updateRule`
  - 接口：`GET /api/member/referral/code/:memberId`、`POST /api/member/referral/bind`、`POST /api/member/referral/settle`、`GET /api/member/referral/rewards/:memberId`、`GET/PUT /api/member/referral/rule`（权限码 `member:referral:*`）

- [ ] **Step 1: 编写失败测试**

Create `backend/src/modules/member/member-referral.service.spec.ts`:

```typescript
import { MemberReferralService } from './member-referral.service';

describe('MemberReferralService', () => {
  const memberRepo: any = { findOneBy: jest.fn(), create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const relRepo: any = { findOneBy: jest.fn(), create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const ruleRepo: any = { findOneBy: jest.fn(), create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const rewardRepo: any = { create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e), findAndCount: jest.fn() };
  const walletService: any = { refund: jest.fn(async () => ({})) };
  const service = new MemberReferralService(memberRepo, relRepo, ruleRepo, rewardRepo, walletService);

  it('bind links invitee to referrer by code', async () => {
    memberRepo.findOneBy.mockResolvedValueOnce({ id: 5, referralCode: 'MABC123' }).mockResolvedValueOnce({ id: 5, referralCode: 'MABC123' });
    relRepo.findOneBy.mockResolvedValue(null);
    const res = await service.bind(9, 'MABC123');
    expect(res.referrerMemberId).toBe(5);
  });

  it('settle pays percent reward to referrer', async () => {
    relRepo.findOneBy.mockResolvedValue({ id: 1, referrerMemberId: 5, inviteeMemberId: 9 });
    ruleRepo.findOneBy.mockResolvedValue({ id: 1, percent: 10, fixedCents: 0, enabled: true });
    const res = await service.settle(5, 9, 'B1', 10000);
    expect(res.rewardCents).toBe(1000);
    expect(walletService.refund).toHaveBeenCalledWith(5, 1000, expect.any(String));
  });

  it('settle returns zero when rule disabled', async () => {
    relRepo.findOneBy.mockResolvedValue({ id: 1, referrerMemberId: 5, inviteeMemberId: 9 });
    ruleRepo.findOneBy.mockResolvedValue({ id: 1, percent: 10, fixedCents: 0, enabled: false });
    const res = await service.settle(5, 9, 'B1', 10000);
    expect(res.rewardCents).toBe(0);
  });
});
```

Run: `npx jest src/modules/member/member-referral.service.spec.ts` — Expected: FAIL。

- [ ] **Step 2: 创建实体**

Modify `member.entity.ts`：加 `@Column({ name: 'referral_code', unique: true, length: 16, nullable: true }) referralCode?: string;`

Create `referral-relation.entity.ts` / `referral-rule.entity.ts` / `referral-reward.entity.ts`（按 Interfaces 字段）。

- [ ] **Step 3: 实现服务**

Create `backend/src/modules/member/member-referral.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Member } from './entities/member.entity';
import { ReferralRelation } from './entities/referral-relation.entity';
import { ReferralRule } from './entities/referral-rule.entity';
import { ReferralReward } from './entities/referral-reward.entity';
import { MemberWalletService } from './member-wallet.service';

@Injectable()
export class MemberReferralService {
  constructor(
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    @InjectRepository(ReferralRelation) private readonly relRepo: Repository<ReferralRelation>,
    @InjectRepository(ReferralRule) private readonly ruleRepo: Repository<ReferralRule>,
    @InjectRepository(ReferralReward) private readonly rewardRepo: Repository<ReferralReward>,
    private readonly walletService: MemberWalletService,
  ) {}

  async getMyCode(memberId: number): Promise<string> {
    const member = await this.memberRepo.findOneBy({ id: memberId });
    if (!member) throw new BusinessException('会员不存在', 40400);
    if (member.referralCode) return member.referralCode;
    const code = `M${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    member.referralCode = code;
    await this.memberRepo.save(member);
    return code;
  }

  async bind(inviteeMemberId: number, code: string): Promise<ReferralRelation> {
    const referrer = await this.memberRepo.findOneBy({ referralCode: code });
    if (!referrer) throw new BusinessException('邀请码无效', 40052);
    if (referrer.id === inviteeMemberId) throw new BusinessException('不能邀请自己', 40054);
    const existing = await this.relRepo.findOneBy({ inviteeMemberId });
    if (existing) throw new BusinessException('已绑定推荐关系', 40053);
    return this.relRepo.save(this.relRepo.create({ referrerMemberId: referrer.id, inviteeMemberId }));
  }

  async settle(referrerMemberId: number, inviteeMemberId: number, orderNo: string, amountCents: number): Promise<ReferralReward> {
    const rule = await this.ruleRepo.findOneBy({ enabled: true });
    let rewardCents = 0;
    if (rule) {
      rewardCents = rule.fixedCents > 0
        ? Math.min(rule.fixedCents, amountCents)
        : Math.round((amountCents * Math.min(100, Math.max(0, rule.percent))) / 100);
    }
    if (rewardCents > 0) {
      await this.walletService.refund(referrerMemberId, rewardCents, `推荐返利 ${orderNo}`);
    }
    return this.rewardRepo.save(this.rewardRepo.create({
      referrerMemberId, inviteeMemberId, orderNo, amountCents, rewardCents,
    }));
  }

  async pageRewards(memberId: number, page = 1, pageSize = 10): Promise<{ list: ReferralReward[]; total: number; page: number; pageSize: number }> {
    const [list, total] = await this.rewardRepo.findAndCount({
      where: { referrerMemberId: memberId },
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' },
    });
    return { list, total, page, pageSize };
  }

  async getRule(): Promise<ReferralRule | null> {
    return this.ruleRepo.findOneBy({});
  }

  async updateRule(dto: { percent: number; fixedCents: number; enabled: boolean }): Promise<ReferralRule> {
    const existing = await this.ruleRepo.findOneBy({});
    if (existing) {
      Object.assign(existing, dto);
      return this.ruleRepo.save(existing);
    }
    return this.ruleRepo.save(this.ruleRepo.create(dto));
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx jest src/modules/member/member-referral.service.spec.ts` — Expected: PASS。

- [ ] **Step 5: 创建控制器并注册**

Create `backend/src/modules/member/member-referral.controller.ts`（按 Interfaces 路由）。

Modify `member.module.ts`：注册实体与服务、控制器。

- [ ] **Step 6: 验证构建与测试**

Run: `npm run build && npm test`
Expected: 通过。

- [ ] **Step 7: 提交**

```bash
git add work/dreamer-v2/backend/src/modules/member
git commit -m "feat: referral codes and consumption rewards"
```

---

### Task 4: 营销活动（发布/报名/发券）

**Files:**
- Create: `work/dreamer-v2/backend/src/modules/member/entities/activity.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/entities/activity-registration.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/dto/save-activity.dto.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-activity.service.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-activity.service.spec.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-activity.controller.ts`
- Modify: `work/dreamer-v2/backend/src/modules/member/member.module.ts`

**Interfaces:**
- Produces:
  - `Activity`：`id`、`title`、`image`、`description`、`startAt`(datetime)、`endAt`(datetime)、`couponId`(nullable，报名发券)、`status`(`draft|published|ended`)、`createdAt`
  - `ActivityRegistration`：`id`、`activityId`、`memberId`、`createdAt`（唯一 `activityId + memberId`）
  - `MemberActivityService`：`pagePublished()`（公开 H5）、`pageAdmin`、`create/update`、`register(memberId, activityId)`（已结束抛 `BusinessException('活动已结束', 40055)`；已报名抛 40050；报名成功若有 couponId 则发券）、`pageRegistrations(activityId)`
  - 接口：`GET /api/member/activities`（公开）、`POST /api/member/activities/:id/register`（公开）、`GET /api/member/activities/admin`、`POST/PUT /api/member/activities`、`GET /api/member/activities/:id/registrations`（权限码 `member:activity:*`）

- [ ] **Step 1: 编写失败测试**

Create `backend/src/modules/member/member-activity.service.spec.ts`:

```typescript
import { MemberActivityService } from './member-activity.service';

describe('MemberActivityService', () => {
  const activityRepo: any = { findOneBy: jest.fn(), create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e), findAndCount: jest.fn(), find: jest.fn() };
  const regRepo: any = { findOneBy: jest.fn(), create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e), find: jest.fn() };
  const couponService: any = { issue: jest.fn(async () => ({})) };
  const service = new MemberActivityService(activityRepo, regRepo, couponService);

  it('register rejects ended activity', async () => {
    activityRepo.findOneBy.mockResolvedValue({ id: 1, status: 'ended' });
    await expect(service.register(1, 1)).rejects.toThrow('活动已结束');
  });

  it('register rejects duplicate', async () => {
    activityRepo.findOneBy.mockResolvedValue({ id: 1, status: 'published' });
    regRepo.findOneBy.mockResolvedValue({ id: 1 });
    await expect(service.register(1, 1)).rejects.toThrow('已报名');
  });

  it('register issues coupon when activity has one', async () => {
    activityRepo.findOneBy.mockResolvedValue({ id: 1, status: 'published', couponId: 2 });
    regRepo.findOneBy.mockResolvedValue(null);
    await service.register(1, 1);
    expect(couponService.issue).toHaveBeenCalledWith(1, 2);
  });
});
```

Run: `npx jest src/modules/member/member-activity.service.spec.ts` — Expected: FAIL。

- [ ] **Step 2: 创建实体与 DTO**

Create `activity.entity.ts` / `activity-registration.entity.ts` / `save-activity.dto.ts`（按 Interfaces 字段，startAt/endAt 用 datetime）。

- [ ] **Step 3: 实现服务**

Create `backend/src/modules/member/member-activity.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Activity } from './entities/activity.entity';
import { ActivityRegistration } from './entities/activity-registration.entity';
import { MemberCouponService } from './member-coupon.service';
import { SaveActivityDto } from './dto/save-activity.dto';

@Injectable()
export class MemberActivityService {
  constructor(
    @InjectRepository(Activity) private readonly activityRepo: Repository<Activity>,
    @InjectRepository(ActivityRegistration) private readonly regRepo: Repository<ActivityRegistration>,
    private readonly couponService: MemberCouponService,
  ) {}

  pagePublished(page = 1, pageSize = 10): Promise<{ list: Activity[]; total: number; page: number; pageSize: number }> {
    return this.activityRepo.findAndCount({
      where: { status: 'published' },
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { startAt: 'DESC' },
    }).then(([list, total]) => ({ list, total, page, pageSize }));
  }

  pageAdmin(page = 1, pageSize = 10): Promise<{ list: Activity[]; total: number; page: number; pageSize: number }> {
    return this.activityRepo.findAndCount({
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' },
    }).then(([list, total]) => ({ list, total, page, pageSize }));
  }

  create(dto: SaveActivityDto): Promise<Activity> {
    return this.activityRepo.save(this.activityRepo.create(dto));
  }

  async update(id: number, dto: SaveActivityDto): Promise<Activity> {
    const activity = await this.activityRepo.findOneBy({ id });
    if (!activity) throw new BusinessException('活动不存在', 40400);
    Object.assign(activity, dto);
    return this.activityRepo.save(activity);
  }

  async register(memberId: number, activityId: number): Promise<ActivityRegistration> {
    const activity = await this.activityRepo.findOneBy({ id: activityId });
    if (!activity) throw new BusinessException('活动不存在', 40400);
    if (activity.status !== 'published') throw new BusinessException('活动已结束', 40055);
    const existing = await this.regRepo.findOneBy({ activityId, memberId });
    if (existing) throw new BusinessException('已报名', 40050);
    if (activity.couponId) await this.couponService.issue(memberId, activity.couponId);
    return this.regRepo.save(this.regRepo.create({ activityId, memberId }));
  }

  pageRegistrations(activityId: number, page = 1, pageSize = 10): Promise<{ list: ActivityRegistration[]; total: number; page: number; pageSize: number }> {
    return this.regRepo.findAndCount({
      where: { activityId },
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' },
    }).then(([list, total]) => ({ list, total, page, pageSize }));
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx jest src/modules/member/member-activity.service.spec.ts` — Expected: PASS。

- [ ] **Step 5: 创建控制器并注册**

Create `backend/src/modules/member/member-activity.controller.ts`（公开列表/报名 + 管理 CRUD/报名列表）。

Modify `member.module.ts`：注册实体与服务、控制器。

- [ ] **Step 6: 验证构建与测试**

Run: `npm run build && npm test`
Expected: 通过。

- [ ] **Step 7: 提交**

```bash
git add work/dreamer-v2/backend/src/modules/member
git commit -m "feat: marketing activities with registration and coupon issue"
```

---

### Task 5: 管理后台运营页面 + 种子 + 服务器验收

**Files:**
- Modify: `work/dreamer-v2/admin/src/api/member.ts`
- Create: `work/dreamer-v2/admin/src/views/member/SigninManage.vue`
- Create: `work/dreamer-v2/admin/src/views/member/BirthdayGift.vue`
- Create: `work/dreamer-v2/admin/src/views/member/ReferralManage.vue`
- Create: `work/dreamer-v2/admin/src/views/member/ActivityManage.vue`
- Modify: `work/dreamer-v2/admin/src/router/index.ts`
- Modify: `work/dreamer-v2/backend/src/seed.ts`

**Interfaces:**
- Consumes: Task 1-4 后端接口
- Produces: 四个页面 + 菜单种子 + 服务器部署与接口冒烟

- [ ] **Step 1: 追加 api**

Modify `admin/src/api/member.ts`：signin/birthday/referral/activity 方法。

- [ ] **Step 2-5: 创建四个页面**

（SigninManage：会员签到记录查询；BirthdayGift：配置生日发券；ReferralManage：返利规则配置 + 返利流水；ActivityManage：活动 CRUD + 报名列表）

- [ ] **Step 6: 注册路由 + 种子菜单**

路由：`member/signin`、`member/birthday`、`member/referral`、`member/activities`。
种子：签到管理/生日礼遇/推荐返利/营销活动 菜单 + 权限码。

- [ ] **Step 7: 验证构建与测试**

Run: `npm run build && npm test`
Expected: 通过。

- [ ] **Step 8: 提交推送**

```bash
git add work/dreamer-v2/admin/src work/dreamer-v2/backend/src/seed.ts
git commit -m "feat: admin member ops pages and seed menus"
git push origin feature/dreamer-v2-rewrite
```

- [ ] **Step 9: 服务器部署 + 冒烟**

拉取、构建、seed、重启；验证签到/生日配置/返利规则/活动发布报名接口；外网页面验证。

---

## 计划自检

**Spec 覆盖：** 覆盖设计文档 3.2 会员区的签到、生日礼遇、推荐返利、营销活动四项；H5 展示与注册防刷属「H5 用户端」计划。

**占位符扫描：** 无 TBD/TODO；每个代码步骤含完整代码与运行命令。

**类型一致性：** `signinDate`/`birthday`(`MM-DD`)/`giftDate` 格式一致；返利 `rewardCents`（分）；活动状态 `draft|published|ended` 前后端一致。
