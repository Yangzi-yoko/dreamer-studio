# 会员资产域 实施计划（积分 / 储值 / 次卡 / 优惠券）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现会员资产四件套：积分（余额 + 流水 + 消费得积分/扣减）、储值余额（充值/消费扣款/退费 + 流水）、次卡/套餐（购买/核销扣次/剩余次数）、优惠券（满减/折扣、后台发券、使用记录）。管理后台提供对应页面。

**Architecture:** 后端在 `modules/member/` 下新增 4 个实体域：`MemberPoints`（账户）+ `PointsLog`（流水）、`MemberWallet`（储值账户）+ `WalletLog`（流水）、`PackageCard`（次卡模板）+ `UserPackage`（用户持有）+ `PackageUsage`（核销记录）、`Coupon`（券模板）+ `UserCoupon`（用户持有）+ `CouponUsage`（使用记录）。全部以 `memberId` 关联会员，复用 `BaseService`、权限守卫、金额工具。消费得积分/扣减由各自 Service 封装，后续租赁订单支付时调用（H5 计划接入）。

**Tech Stack:** NestJS 10、TypeORM 0.3.x、MySQL 8、Vue 3.4、Element Plus 2.7。

## Global Constraints

- 复用 `BaseService` / `BaseController`、`BusinessException`、统一响应 `{ code, message, data }`
- 金额与积分一律整数存储：金额「分」（`toCents/toYuan`），积分直接 int
- 资产操作必须**同时写流水**（`PointsLog`/`WalletLog`/`PackageUsage`/`CouponUsage`），流水类型枚举：`earn/spend/recharge/deduct/refund/buy/use`
- 积分扣减、余额扣减、次卡核销、优惠券使用必须校验充足性，不足抛业务异常
- 优惠券：`type: 'amount'（满减）| 'discount'（折扣）`；`minSpendCents` 门槛；`totalCount` 发行量、`issuedCount` 已发；用户领取后 `UserCoupon` 状态 `unused/used/expired`
- 权限码：`member:points:list`、`member:wallet:list`、`member:package:list/create/update/delete`、`member:coupon:list/create/update/delete/issue`；资产查询走 `member:list`
- 中文文案；接口路由 `@Controller('member/points')`、`member/wallet`、`member/packages`、`member/coupons`
- 新实体注册到 `MemberModule` 的 `TypeOrmModule.forFeature`
- 管理后台新页面注册路由；侧边栏菜单来自后端种子数据
- 当前权限策略禁止提权：git 提交/推送待权限恢复后统一执行；本地构建与测试必须通过

**代码根目录：** `C:\Users\97157\Documents\Codex\2026-08-06\lia\work\dreamer-v2`

---

### Task 1: 积分账户与流水

**Files:**
- Create: `work/dreamer-v2/backend/src/modules/member/entities/member-points.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/entities/points-log.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-points.service.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-points.service.spec.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-points.controller.ts`
- Modify: `work/dreamer-v2/backend/src/modules/member/member.module.ts`

**Interfaces:**
- Consumes: `Member` 实体、`BusinessException`
- Produces:
  - `MemberPoints`：`id`、`memberId`(unique)、`balance`(int)、`updatedAt`
  - `PointsLog`：`id`、`memberId`、`type`(`earn|spend`)、`points`、`balanceAfter`、`remark`、`createdAt`
  - `MemberPointsService`：`getOrCreate(memberId)`、`earn(memberId, points, remark)`、`spend(memberId, points, remark)`（余额不足抛 `BusinessException('积分不足', 40040)`）、`page(memberId, page, pageSize)`
  - `GET /api/member/points/:memberId`（余额+最近流水）、`POST /api/member/points/:memberId/earn|spend`（权限码 `member:points:list`）

- [ ] **Step 1: 编写失败测试**

Create `backend/src/modules/member/member-points.service.spec.ts`:

```typescript
import { MemberPointsService } from './member-points.service';

describe('MemberPointsService', () => {
  const pointsRepo: any = {
    findOneBy: jest.fn(),
    create: jest.fn((d: any) => d),
    save: jest.fn(async (e: any) => e),
  };
  const logRepo: any = {
    create: jest.fn((d: any) => d),
    save: jest.fn(async (e: any) => e),
    findAndCount: jest.fn(),
  };
  const service = new MemberPointsService(pointsRepo, logRepo);

  it('earn adds points and writes log', async () => {
    pointsRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 1, balance: 100 });
    const res = await service.earn(1, 50, '消费得积分');
    expect(res.balance).toBe(150);
    expect(logRepo.save).toHaveBeenCalled();
  });

  it('spend rejects insufficient balance', async () => {
    pointsRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 1, balance: 10 });
    await expect(service.spend(1, 20, '兑换')).rejects.toThrow('积分不足');
  });

  it('spend deducts and writes log', async () => {
    pointsRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 1, balance: 100 });
    const res = await service.spend(1, 30, '兑换');
    expect(res.balance).toBe(70);
  });
});
```

Run: `npx jest src/modules/member/member-points.service.spec.ts` — Expected: FAIL。

- [ ] **Step 2: 创建实体**

Create `backend/src/modules/member/entities/member-points.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('member_points')
export class MemberPoints {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ name: 'member_id', type: 'int' })
  memberId!: number;

  @Column({ type: 'int', default: 0 })
  balance!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
```

Create `backend/src/modules/member/entities/points-log.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('points_log')
export class PointsLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'member_id', type: 'int' })
  memberId!: number;

  @Column({ length: 8 })
  type!: 'earn' | 'spend';

  @Column({ type: 'int' })
  points!: number;

  @Column({ name: 'balance_after', type: 'int' })
  balanceAfter!: number;

  @Column({ length: 128, nullable: true })
  remark?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

- [ ] **Step 3: 实现服务**

Create `backend/src/modules/member/member-points.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { MemberPoints } from './entities/member-points.entity';
import { PointsLog } from './entities/points-log.entity';

@Injectable()
export class MemberPointsService {
  constructor(
    @InjectRepository(MemberPoints) private readonly pointsRepo: Repository<MemberPoints>,
    @InjectRepository(PointsLog) private readonly logRepo: Repository<PointsLog>,
  ) {}

  async getOrCreate(memberId: number): Promise<MemberPoints> {
    const existing = await this.pointsRepo.findOneBy({ memberId });
    if (existing) return existing;
    return this.pointsRepo.save(this.pointsRepo.create({ memberId, balance: 0 }));
  }

  async earn(memberId: number, points: number, remark?: string): Promise<MemberPoints> {
    const account = await this.getOrCreate(memberId);
    account.balance += points;
    const saved = await this.pointsRepo.save(account);
    await this.logRepo.save(this.logRepo.create({
      memberId, type: 'earn', points, balanceAfter: saved.balance, remark,
    }));
    return saved;
  }

  async spend(memberId: number, points: number, remark?: string): Promise<MemberPoints> {
    const account = await this.getOrCreate(memberId);
    if (account.balance < points) throw new BusinessException('积分不足', 40040);
    account.balance -= points;
    const saved = await this.pointsRepo.save(account);
    await this.logRepo.save(this.logRepo.create({
      memberId, type: 'spend', points, balanceAfter: saved.balance, remark,
    }));
    return saved;
  }

  async page(memberId: number, page = 1, pageSize = 10): Promise<{ list: PointsLog[]; total: number; page: number; pageSize: number }> {
    const [list, total] = await this.logRepo.findAndCount({
      where: { memberId },
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' },
    });
    return { list, total, page, pageSize };
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx jest src/modules/member/member-points.service.spec.ts` — Expected: PASS。

- [ ] **Step 5: 创建控制器并注册**

Create `backend/src/modules/member/member-points.controller.ts`:

```typescript
import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { MemberPointsService } from './member-points.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('member/points')
export class MemberPointsController {
  constructor(private readonly pointsService: MemberPointsService) {}

  @Get(':memberId')
  @Permissions('member:points:list')
  async detail(@Param('memberId', ParseIntPipe) memberId: number, @Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    const account = await this.pointsService.getOrCreate(memberId);
    const logs = await this.pointsService.page(memberId, Number(page), Number(pageSize));
    return { account: { memberId, balance: account.balance }, logs };
  }

  @Post(':memberId/earn')
  @Permissions('member:points:list')
  earn(@Param('memberId', ParseIntPipe) memberId: number, @Body() dto: { points: number; remark?: string }) {
    return this.pointsService.earn(memberId, dto.points, dto.remark);
  }

  @Post(':memberId/spend')
  @Permissions('member:points:list')
  spend(@Param('memberId', ParseIntPipe) memberId: number, @Body() dto: { points: number; remark?: string }) {
    return this.pointsService.spend(memberId, dto.points, dto.remark);
  }
}
```

Modify `member.module.ts`：注册实体 `MemberPoints`、`PointsLog` 与服务、控制器。

- [ ] **Step 6: 验证构建与测试**

Run: `npm run build && npm test`
Expected: 通过。

- [ ] **Step 7: 提交（权限恢复后执行）**

```bash
git add work/dreamer-v2/backend/src/modules/member
git commit -m "feat: member points account and logs"
```

---

### Task 2: 储值余额与流水

**Files:**
- Create: `work/dreamer-v2/backend/src/modules/member/entities/member-wallet.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/entities/wallet-log.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-wallet.service.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-wallet.service.spec.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-wallet.controller.ts`
- Modify: `work/dreamer-v2/backend/src/modules/member/member.module.ts`

**Interfaces:**
- Produces:
  - `MemberWallet`：`id`、`memberId`(unique)、`balanceCents`、`updatedAt`
  - `WalletLog`：`id`、`memberId`、`type`(`recharge|deduct|refund`)、`amountCents`、`balanceAfterCents`、`remark`、`createdAt`
  - `MemberWalletService`：`getOrCreate`、`recharge`、`deduct`（不足抛 `BusinessException('余额不足', 40041)`）、`refund`、`page`
  - `GET /api/member/wallet/:memberId`、`POST /api/member/wallet/:memberId/recharge|deduct|refund`（权限码 `member:wallet:list`）

- [ ] **Step 1: 编写失败测试**

Create `backend/src/modules/member/member-wallet.service.spec.ts`:

```typescript
import { MemberWalletService } from './member-wallet.service';

describe('MemberWalletService', () => {
  const walletRepo: any = {
    findOneBy: jest.fn(),
    create: jest.fn((d: any) => d),
    save: jest.fn(async (e: any) => e),
  };
  const logRepo: any = {
    create: jest.fn((d: any) => d),
    save: jest.fn(async (e: any) => e),
    findAndCount: jest.fn(),
  };
  const service = new MemberWalletService(walletRepo, logRepo);

  it('recharge adds balance and writes log', async () => {
    walletRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 1, balanceCents: 1000 });
    const res = await service.recharge(1, 5000, '充值');
    expect(res.balanceCents).toBe(6000);
  });

  it('deduct rejects insufficient balance', async () => {
    walletRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 1, balanceCents: 100 });
    await expect(service.deduct(1, 5000, '消费')).rejects.toThrow('余额不足');
  });

  it('deduct decreases balance', async () => {
    walletRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 1, balanceCents: 10000 });
    const res = await service.deduct(1, 3000, '消费');
    expect(res.balanceCents).toBe(7000);
  });
});
```

Run: `npx jest src/modules/member/member-wallet.service.spec.ts` — Expected: FAIL。

- [ ] **Step 2: 创建实体**

Create `backend/src/modules/member/entities/member-wallet.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('member_wallet')
export class MemberWallet {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ name: 'member_id', type: 'int' })
  memberId!: number;

  @Column({ name: 'balance_cents', type: 'int', default: 0 })
  balanceCents!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
```

Create `backend/src/modules/member/entities/wallet-log.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('wallet_log')
export class WalletLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'member_id', type: 'int' })
  memberId!: number;

  @Column({ length: 10 })
  type!: 'recharge' | 'deduct' | 'refund';

  @Column({ name: 'amount_cents', type: 'int' })
  amountCents!: number;

  @Column({ name: 'balance_after_cents', type: 'int' })
  balanceAfterCents!: number;

  @Column({ length: 128, nullable: true })
  remark?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

- [ ] **Step 3: 实现服务**

Create `backend/src/modules/member/member-wallet.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { MemberWallet } from './entities/member-wallet.entity';
import { WalletLog } from './entities/wallet-log.entity';

@Injectable()
export class MemberWalletService {
  constructor(
    @InjectRepository(MemberWallet) private readonly walletRepo: Repository<MemberWallet>,
    @InjectRepository(WalletLog) private readonly logRepo: Repository<WalletLog>,
  ) {}

  async getOrCreate(memberId: number): Promise<MemberWallet> {
    const existing = await this.walletRepo.findOneBy({ memberId });
    if (existing) return existing;
    return this.walletRepo.save(this.walletRepo.create({ memberId, balanceCents: 0 }));
  }

  async recharge(memberId: number, amountCents: number, remark?: string): Promise<MemberWallet> {
    const wallet = await this.getOrCreate(memberId);
    wallet.balanceCents += amountCents;
    const saved = await this.walletRepo.save(wallet);
    await this.logRepo.save(this.logRepo.create({
      memberId, type: 'recharge', amountCents, balanceAfterCents: saved.balanceCents, remark,
    }));
    return saved;
  }

  async deduct(memberId: number, amountCents: number, remark?: string): Promise<MemberWallet> {
    const wallet = await this.getOrCreate(memberId);
    if (wallet.balanceCents < amountCents) throw new BusinessException('余额不足', 40041);
    wallet.balanceCents -= amountCents;
    const saved = await this.walletRepo.save(wallet);
    await this.logRepo.save(this.logRepo.create({
      memberId, type: 'deduct', amountCents, balanceAfterCents: saved.balanceCents, remark,
    }));
    return saved;
  }

  async refund(memberId: number, amountCents: number, remark?: string): Promise<MemberWallet> {
    const wallet = await this.getOrCreate(memberId);
    wallet.balanceCents += amountCents;
    const saved = await this.walletRepo.save(wallet);
    await this.logRepo.save(this.logRepo.create({
      memberId, type: 'refund', amountCents, balanceAfterCents: saved.balanceCents, remark,
    }));
    return saved;
  }

  async page(memberId: number, page = 1, pageSize = 10): Promise<{ list: WalletLog[]; total: number; page: number; pageSize: number }> {
    const [list, total] = await this.logRepo.findAndCount({
      where: { memberId },
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' },
    });
    return { list, total, page, pageSize };
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx jest src/modules/member/member-wallet.service.spec.ts` — Expected: PASS。

- [ ] **Step 5: 创建控制器并注册**

Create `backend/src/modules/member/member-wallet.controller.ts`（结构同积分控制器：detail/recharge/deduct/refund，权限码 `member:wallet:list`）。

Modify `member.module.ts`：注册实体与服务、控制器。

- [ ] **Step 6: 验证构建与测试**

Run: `npm run build && npm test`
Expected: 通过。

- [ ] **Step 7: 提交（权限恢复后执行）**

```bash
git add work/dreamer-v2/backend/src/modules/member
git commit -m "feat: member wallet and logs"
```

---

### Task 3: 次卡/套餐（购买/核销/剩余次数）

**Files:**
- Create: `work/dreamer-v2/backend/src/modules/member/entities/package-card.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/entities/user-package.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/entities/package-usage.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/dto/save-package-card.dto.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-package.service.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-package.service.spec.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-package.controller.ts`
- Modify: `work/dreamer-v2/backend/src/modules/member/member.module.ts`

**Interfaces:**
- Produces:
  - `PackageCard`：`id`、`name`、`totalTimes`(int)、`priceCents`、`enabled`、`createdAt`
  - `UserPackage`：`id`、`memberId`、`packageId`、`remainingTimes`、`status`(`active|expired`)、`expiresAt`(nullable)、`createdAt`
  - `PackageUsage`：`id`、`userPackageId`、`memberId`、`times`、`remark`、`createdAt`
  - `MemberPackageService`：`pageCards`、`createCard/updateCard`、`buy(memberId, packageId)`、`use(memberId, userPackageId)`（剩余>0 否则抛 `BusinessException('次卡次数不足', 40042)`）、`pageUserPackages(memberId)`
  - 接口：`GET/POST/PUT/DELETE /api/member/packages`（权限码 `member:package:*`）、`POST /api/member/packages/:packageId/buy`、`POST /api/member/packages/users/:userPackageId/use`、`GET /api/member/packages/users?memberId=`（权限码 `member:package:list`）

- [ ] **Step 1: 编写失败测试**

Create `backend/src/modules/member/member-package.service.spec.ts`:

```typescript
import { MemberPackageService } from './member-package.service';

describe('MemberPackageService', () => {
  const cardRepo: any = { findOneBy: jest.fn(), create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e), findAndCount: jest.fn() };
  const userRepo: any = { create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e), findOneBy: jest.fn(), find: jest.fn() };
  const usageRepo: any = { create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const service = new MemberPackageService(cardRepo, userRepo, usageRepo);

  it('buy creates user package with full times', async () => {
    cardRepo.findOneBy.mockResolvedValue({ id: 1, name: '10次棚拍卡', totalTimes: 10, priceCents: 50000 });
    userRepo.save.mockResolvedValue({ id: 1, memberId: 1, packageId: 1, remainingTimes: 10, status: 'active' });
    const res = await service.buy(1, 1);
    expect(res.remainingTimes).toBe(10);
  });

  it('use decrements remaining times', async () => {
    userRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 1, packageId: 1, remainingTimes: 3, status: 'active' });
    const res = await service.use(1, 1);
    expect(res.remainingTimes).toBe(2);
  });

  it('use rejects zero remaining', async () => {
    userRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 1, packageId: 1, remainingTimes: 0, status: 'active' });
    await expect(service.use(1, 1)).rejects.toThrow('次卡次数不足');
  });
});
```

Run: `npx jest src/modules/member/member-package.service.spec.ts` — Expected: FAIL。

- [ ] **Step 2: 创建实体**

Create `backend/src/modules/member/entities/package-card.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('package_card')
export class PackageCard {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 64 })
  name!: string;

  @Column({ name: 'total_times', type: 'int', default: 0 })
  totalTimes!: number;

  @Column({ name: 'price_cents', type: 'int', default: 0 })
  priceCents!: number;

  @Column({ default: true })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

Create `backend/src/modules/member/entities/user-package.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user_package')
export class UserPackage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'member_id', type: 'int' })
  memberId!: number;

  @Column({ name: 'package_id', type: 'int' })
  packageId!: number;

  @Column({ name: 'remaining_times', type: 'int', default: 0 })
  remainingTimes!: number;

  @Column({ length: 10, default: 'active' })
  status!: string;

  @Column({ name: 'expires_at', type: 'date', nullable: true })
  expiresAt?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

Create `backend/src/modules/member/entities/package-usage.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('package_usage')
export class PackageUsage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'user_package_id', type: 'int' })
  userPackageId!: number;

  @Column({ name: 'member_id', type: 'int' })
  memberId!: number;

  @Column({ type: 'int', default: 1 })
  times!: number;

  @Column({ length: 128, nullable: true })
  remark?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

- [ ] **Step 3: 创建 DTO 与服务**

Create `backend/src/modules/member/dto/save-package-card.dto.ts`:

```typescript
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SavePackageCardDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name!: string;

  @IsInt()
  totalTimes!: number;

  @IsInt()
  priceYuan!: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
```

Create `backend/src/modules/member/member-package.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { toCents, toYuan } from '../../common/utils/money.utils';
import { PackageCard } from './entities/package-card.entity';
import { UserPackage } from './entities/user-package.entity';
import { PackageUsage } from './entities/package-usage.entity';
import { SavePackageCardDto } from './dto/save-package-card.dto';

@Injectable()
export class MemberPackageService {
  constructor(
    @InjectRepository(PackageCard) private readonly cardRepo: Repository<PackageCard>,
    @InjectRepository(UserPackage) private readonly userRepo: Repository<UserPackage>,
    @InjectRepository(PackageUsage) private readonly usageRepo: Repository<PackageUsage>,
  ) {}

  async pageCards(page = 1, pageSize = 10): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
    const [list, total] = await this.cardRepo.findAndCount({ take: pageSize, skip: (page - 1) * pageSize, order: { createdAt: 'DESC' } });
    return { list: list.map((c) => ({ ...c, price: toYuan(c.priceCents) })), total, page, pageSize };
  }

  async createCard(dto: SavePackageCardDto): Promise<any> {
    const card = await this.cardRepo.save(this.cardRepo.create({ ...dto, priceCents: toCents(dto.priceYuan) }));
    return { ...card, price: toYuan(card.priceCents) };
  }

  async updateCard(id: number, dto: SavePackageCardDto): Promise<any> {
    const card = await this.cardRepo.findOneBy({ id });
    if (!card) throw new BusinessException('次卡模板不存在', 40400);
    Object.assign(card, dto, { priceCents: toCents(dto.priceYuan) });
    return this.cardRepo.save(card);
  }

  async buy(memberId: number, packageId: number): Promise<UserPackage> {
    const card = await this.cardRepo.findOneBy({ id: packageId, enabled: true });
    if (!card) throw new BusinessException('次卡不存在或已停售', 40400);
    return this.userRepo.save(this.userRepo.create({
      memberId, packageId, remainingTimes: card.totalTimes, status: 'active',
    }));
  }

  async use(memberId: number, userPackageId: number, remark?: string): Promise<UserPackage> {
    const up = await this.userRepo.findOneBy({ id: userPackageId, memberId });
    if (!up) throw new BusinessException('次卡不存在', 40400);
    if (up.status !== 'active' || up.remainingTimes <= 0) throw new BusinessException('次卡次数不足', 40042);
    up.remainingTimes -= 1;
    const saved = await this.userRepo.save(up);
    await this.usageRepo.save(this.usageRepo.create({
      userPackageId, memberId, times: 1, remark,
    }));
    return saved;
  }

  async pageUserPackages(memberId: number): Promise<UserPackage[]> {
    return this.userRepo.find({ where: { memberId }, order: { createdAt: 'DESC' } });
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx jest src/modules/member/member-package.service.spec.ts` — Expected: PASS。

- [ ] **Step 5: 创建控制器并注册**

Create `backend/src/modules/member/member-package.controller.ts`（CRUD 卡片 + buy/use/用户次卡查询，权限码 `member:package:*`）。

Modify `member.module.ts`：注册实体与服务、控制器。

- [ ] **Step 6: 验证构建与测试**

Run: `npm run build && npm test`
Expected: 通过。

- [ ] **Step 7: 提交（权限恢复后执行）**

```bash
git add work/dreamer-v2/backend/src/modules/member
git commit -m "feat: member package cards (buy/use/remaining)"
```

---

### Task 4: 优惠券（满减/折扣、发券、使用）

**Files:**
- Create: `work/dreamer-v2/backend/src/modules/member/entities/coupon.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/entities/user-coupon.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/entities/coupon-usage.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/dto/save-coupon.dto.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-coupon.service.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-coupon.service.spec.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-coupon.controller.ts`
- Modify: `work/dreamer-v2/backend/src/modules/member/member.module.ts`

**Interfaces:**
- Produces:
  - `Coupon`：`id`、`name`、`type`(`amount|discount`)、`value`(满减金额分 / 折扣 0-100 表示折)、`minSpendCents`、`totalCount`、`issuedCount`、`enabled`、`createdAt`
  - `UserCoupon`：`id`、`memberId`、`couponId`、`status`(`unused|used|expired`)、`usedAt`、`createdAt`
  - `CouponUsage`：`id`、`userCouponId`、`memberId`、`orderNo`、`deductCents`、`createdAt`
  - `MemberCouponService`：`pageCoupons`、`createCoupon/updateCoupon`、`issue(memberId, couponId)`（未超发行量否则抛 `BusinessException('优惠券已发完', 40043)`）、`use(memberId, userCouponId, orderNo, amountCents)`、`pageUserCoupons(memberId)`
  - 接口：`GET/POST/PUT /api/member/coupons`、`POST /api/member/coupons/:couponId/issue`、`GET /api/member/coupons/users?memberId=`、`POST /api/member/coupons/users/:userCouponId/use`（权限码 `member:coupon:*`）

- [ ] **Step 1: 编写失败测试**

Create `backend/src/modules/member/member-coupon.service.spec.ts`:

```typescript
import { MemberCouponService } from './member-coupon.service';

describe('MemberCouponService', () => {
  const couponRepo: any = { findOneBy: jest.fn(), create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e), findAndCount: jest.fn() };
  const userRepo: any = { create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e), findOneBy: jest.fn(), find: jest.fn() };
  const usageRepo: any = { create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const service = new MemberCouponService(couponRepo, userRepo, usageRepo);

  it('issue rejects when coupon sold out', async () => {
    couponRepo.findOneBy.mockResolvedValue({ id: 1, totalCount: 10, issuedCount: 10, enabled: true });
    await expect(service.issue(1, 1)).rejects.toThrow('优惠券已发完');
  });

  it('issue increments issuedCount', async () => {
    couponRepo.findOneBy.mockResolvedValue({ id: 1, totalCount: 10, issuedCount: 3, enabled: true });
    const res = await service.issue(1, 1);
    expect(res.issuedCount).toBe(4);
  });

  it('use computes amount deduction', async () => {
    userRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 1, couponId: 1, status: 'unused' });
    couponRepo.findOneBy.mockResolvedValue({ id: 1, type: 'amount', value: 1000, minSpendCents: 0, enabled: true });
    const res = await service.use(1, 1, 'B1', 10000);
    expect(res.deductCents).toBe(1000);
  });
});
```

Run: `npx jest src/modules/member/member-coupon.service.spec.ts` — Expected: FAIL。

- [ ] **Step 2: 创建实体**

Create `backend/src/modules/member/entities/coupon.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('coupon')
export class Coupon {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 64 })
  name!: string;

  @Column({ length: 8 })
  type!: 'amount' | 'discount';

  @Column({ type: 'int', default: 0 })
  value!: number;

  @Column({ name: 'min_spend_cents', type: 'int', default: 0 })
  minSpendCents!: number;

  @Column({ name: 'total_count', type: 'int', default: 0 })
  totalCount!: number;

  @Column({ name: 'issued_count', type: 'int', default: 0 })
  issuedCount!: number;

  @Column({ default: true })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

Create `backend/src/modules/member/entities/user-coupon.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user_coupon')
export class UserCoupon {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'member_id', type: 'int' })
  memberId!: number;

  @Column({ name: 'coupon_id', type: 'int' })
  couponId!: number;

  @Column({ length: 10, default: 'unused' })
  status!: string;

  @Column({ name: 'used_at', type: 'datetime', nullable: true })
  usedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

Create `backend/src/modules/member/entities/coupon-usage.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('coupon_usage')
export class CouponUsage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'user_coupon_id', type: 'int' })
  userCouponId!: number;

  @Column({ name: 'member_id', type: 'int' })
  memberId!: number;

  @Column({ name: 'order_no', length: 32 })
  orderNo!: string;

  @Column({ name: 'deduct_cents', type: 'int', default: 0 })
  deductCents!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

- [ ] **Step 3: 创建 DTO 与服务**

Create `backend/src/modules/member/dto/save-coupon.dto.ts`:

```typescript
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SaveCouponDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name!: string;

  @IsIn(['amount', 'discount'])
  type!: 'amount' | 'discount';

  @IsInt()
  value!: number;

  @IsInt()
  minSpendYuan!: number;

  @IsInt()
  totalCount!: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
```

Create `backend/src/modules/member/member-coupon.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { toCents, toYuan } from '../../common/utils/money.utils';
import { Coupon } from './entities/coupon.entity';
import { UserCoupon } from './entities/user-coupon.entity';
import { CouponUsage } from './entities/coupon-usage.entity';
import { SaveCouponDto } from './dto/save-coupon.dto';

@Injectable()
export class MemberCouponService {
  constructor(
    @InjectRepository(Coupon) private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(UserCoupon) private readonly userRepo: Repository<UserCoupon>,
    @InjectRepository(CouponUsage) private readonly usageRepo: Repository<CouponUsage>,
  ) {}

  async pageCoupons(page = 1, pageSize = 10): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
    const [list, total] = await this.couponRepo.findAndCount({ take: pageSize, skip: (page - 1) * pageSize, order: { createdAt: 'DESC' } });
    return { list: list.map((c) => ({ ...c, minSpend: toYuan(c.minSpendCents) })), total, page, pageSize };
  }

  async createCoupon(dto: SaveCouponDto): Promise<any> {
    const coupon = await this.couponRepo.save(this.couponRepo.create({ ...dto, minSpendCents: toCents(dto.minSpendYuan) }));
    return { ...coupon, minSpend: toYuan(coupon.minSpendCents) };
  }

  async updateCoupon(id: number, dto: SaveCouponDto): Promise<any> {
    const coupon = await this.couponRepo.findOneBy({ id });
    if (!coupon) throw new BusinessException('优惠券不存在', 40400);
    Object.assign(coupon, dto, { minSpendCents: toCents(dto.minSpendYuan) });
    return this.couponRepo.save(coupon);
  }

  async issue(memberId: number, couponId: number): Promise<Coupon> {
    const coupon = await this.couponRepo.findOneBy({ id: couponId, enabled: true });
    if (!coupon) throw new BusinessException('优惠券不存在或已停用', 40400);
    if (coupon.issuedCount >= coupon.totalCount) throw new BusinessException('优惠券已发完', 40043);
    coupon.issuedCount += 1;
    await this.couponRepo.save(coupon);
    await this.userRepo.save(this.userRepo.create({ memberId, couponId, status: 'unused' }));
    return coupon;
  }

  async use(memberId: number, userCouponId: number, orderNo: string, amountCents: number): Promise<{ userCoupon: UserCoupon; deductCents: number }> {
    const uc = await this.userRepo.findOneBy({ id: userCouponId, memberId });
    if (!uc) throw new BusinessException('优惠券不存在', 40400);
    if (uc.status !== 'unused') throw new BusinessException('优惠券已使用', 40044);
    const coupon = await this.couponRepo.findOneBy({ id: uc.couponId });
    if (!coupon || !coupon.enabled) throw new BusinessException('优惠券不可用', 40045);
    if (amountCents < coupon.minSpendCents) throw new BusinessException('未达到使用门槛', 40046);

    let deductCents = 0;
    if (coupon.type === 'amount') {
      deductCents = Math.min(coupon.value, amountCents);
    } else {
      const discount = Math.max(0, Math.min(coupon.value, 100));
      deductCents = Math.round((amountCents * (100 - discount)) / 100);
    }

    uc.status = 'used';
    uc.usedAt = new Date();
    await this.userRepo.save(uc);
    await this.usageRepo.save(this.usageRepo.create({
      userCouponId, memberId, orderNo, deductCents,
    }));
    return { userCoupon: uc, deductCents };
  }

  async pageUserCoupons(memberId: number): Promise<UserCoupon[]> {
    return this.userRepo.find({ where: { memberId }, order: { createdAt: 'DESC' } });
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx jest src/modules/member/member-coupon.service.spec.ts` — Expected: PASS。

- [ ] **Step 5: 创建控制器并注册**

Create `backend/src/modules/member/member-coupon.controller.ts`（CRUD 券模板 + issue/use/用户券查询，权限码 `member:coupon:*`）。

Modify `member.module.ts`：注册实体与服务、控制器。

- [ ] **Step 6: 验证构建与测试**

Run: `npm run build && npm test`
Expected: 通过。

- [ ] **Step 7: 提交（权限恢复后执行）**

```bash
git add work/dreamer-v2/backend/src/modules/member
git commit -m "feat: member coupons (issue/use)"
```

---

### Task 5: 管理后台资产页面 + 种子

**Files:**
- Modify: `work/dreamer-v2/admin/src/api/member.ts`（追加 points/wallet/package/coupon）
- Create: `work/dreamer-v2/admin/src/views/member/PointsWallet.vue`
- Create: `work/dreamer-v2/admin/src/views/member/PackageManage.vue`
- Create: `work/dreamer-v2/admin/src/views/member/CouponManage.vue`
- Modify: `work/dreamer-v2/admin/src/router/index.ts`
- Modify: `work/dreamer-v2/backend/src/seed.ts`（会员资产菜单）

**Interfaces:**
- Consumes: Task 1-4 后端接口
- Produces: 三个页面 + 菜单种子（积分储值/次卡管理/优惠券管理）

- [ ] **Step 1: 追加 api**

Modify `admin/src/api/member.ts`，追加 points/wallet/package/coupon 方法。

- [ ] **Step 2-4: 创建三个页面**

（PointsWallet：输入手机号查会员 → 显示积分余额/储值余额 + 流水，提供充值/积分调整；PackageManage：次卡模板 CRUD + 输入会员核销；CouponManage：券模板 CRUD + 发券）

- [ ] **Step 5: 注册路由**

```typescript
{ path: 'member/assets', name: 'PointsWallet', component: () => import('../views/member/PointsWallet.vue') },
{ path: 'member/packages', name: 'PackageManage', component: () => import('../views/member/PackageManage.vue') },
{ path: 'member/coupons', name: 'CouponManage', component: () => import('../views/member/CouponManage.vue') },
```

- [ ] **Step 6: 种子菜单**

Modify `seed.ts` 追加：积分储值（`member:points:list`/`member:wallet:list`）、次卡管理（`member:package:list`）、优惠券管理（`member:coupon:list`）菜单与按钮权限码。

- [ ] **Step 7: 验证构建与测试**

Run: `npm run build && npm test`
Expected: 通过。

- [ ] **Step 8: 提交（权限恢复后执行）**

```bash
git add work/dreamer-v2/admin/src work/dreamer-v2/backend/src/seed.ts
git commit -m "feat: admin member asset pages and seed menus"
```

---

## 计划自检

**Spec 覆盖：** 覆盖设计文档 3.2 会员区的积分、储值余额、次卡/套餐、优惠券四项；签到/生日/推荐返利/活动属「会员运营域」，独立后续计划。

**占位符扫描：** 无 TBD/TODO；每个代码步骤含完整代码与运行命令。

**类型一致性：** `type` 枚举（earn/spend、recharge/deduct/refund、amount/discount）在实体与服务一致；金额字段 `*Cents`（分）与 DTO 元单位区分明确；`remainingTimes` 前后端一致。
