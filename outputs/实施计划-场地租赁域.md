# 场地租赁域 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在已完成平台底座（NestJS + Vue3 管理后台）上实现场地租赁核心业务：场地管理、每日可预订时段档期、防重复预订、预订下单（金额计算 + 押金）、订单状态机（待支付→已支付→已核销→已完成/已取消/已退款）、后台日历排期与核销操作。

**Architecture:** 后端新增 `modules/rental/` 模块（Studio / TimeSlot / Booking 三个子域，各自 service + controller + dto），实体使用 TypeORM，时段冲突通过事务 + 行锁 + Redis 分布式锁双重防重。管理后台新增「租赁管理」菜单下的场地、时段、订单、日历四个页面。会员优惠券/储值/积分叠加属于后续会员域，本计划只做基础金额计算，接口预留 `discount` 字段。

**Tech Stack:** NestJS 10、TypeORM 0.3.x、MySQL 8、redis 4.x（已有 `RedisService`）、Vue 3.4、Element Plus 2.7、Vue Router 4、Pinia。

## Global Constraints

- 复用现有 `BaseService` / `BaseController`（主键为 int，`ParseIntPipe`）
- 所有接口统一返回 `{ code, message, data }`；业务错误必须 `BusinessException`
- 权限：租赁接口使用权限码 `rental:studio:*`、`rental:booking:*`；`@UseGuards(JwtAuthGuard, PermissionsGuard)`
- 金额一律用整数「分」存储（`int`），工具函数负责转换；订单金额 = 时段数 × 单价（工作日/周末/节假日），另存押金
- 时段冲突必须满足：同一场地同一日期同一时段，最多一个有效订单（状态非 cancelled/refunded）
- 订单状态机：`pending → paid → checked → completed`；`pending → cancelled`；`paid → refunded`（已支付后取消走退款）
- 中文文案；日期使用 `YYYY-MM-DD`，时间使用 `HH:mm`
- 所有新增实体必须注册到 `TypeOrmModule.forFeature` 对应模块，`app.module.ts` 加入 `RentalModule`
- 管理后台新页面必须注册路由 + 侧边栏菜单来自后端 `GET /api/auth/menus` 的种子数据
- 当前环境未安装 git：提交步骤如无法执行，跳过并在日志注明；git 可用时使用特性分支
- 本地 `npm install` 可能需要网络授权，失败时以提权方式重试；PowerShell 下用 `npm.cmd` / `npx.cmd`

**代码根目录：** `C:\Users\97157\Documents\Codex\2026-08-06\lia\work\dreamer-v2`

---

### Task 1: 金额与日期工具函数（含测试）

**Files:**
- Create: `work/dreamer-v2/backend/src/common/utils/money.utils.ts`
- Create: `work/dreamer-v2/backend/src/common/utils/money.utils.spec.ts`
- Create: `work/dreamer-v2/backend/src/common/utils/date.utils.ts`
- Create: `work/dreamer-v2/backend/src/common/utils/date.utils.spec.ts`

**Interfaces:**
- Consumes: 无
- Produces:
  - `toCents(yuan: number): number`、`toYuan(cents: number): number`
  - `isWeekend(date: Date): boolean`、`isHoliday(date: Date): boolean`（内置 2026 中国法定节假日表：元旦、春节、清明、劳动、端午、中秋、国庆）
  - `formatDate(d: Date): string`（`YYYY-MM-DD`）、`parseDate(s: string): Date`（本地时区零点）

- [ ] **Step 1: 编写失败测试（金额工具）**

Create `backend/src/common/utils/money.utils.spec.ts`:

```typescript
import { toCents, toYuan } from './money.utils';

describe('money.utils', () => {
  it('converts yuan to cents exactly', () => {
    expect(toCents(199.99)).toBe(19999);
    expect(toCents(0.1)).toBe(10);
  });
  it('converts cents to yuan', () => {
    expect(toYuan(19999)).toBe(199.99);
  });
});
```

Run: `npx jest src/common/utils/money.utils.spec.ts` — Expected: FAIL。

- [ ] **Step 2: 实现金额工具**

Create `backend/src/common/utils/money.utils.ts`:

```typescript
export function toCents(yuan: number): number {
  return Math.round(yuan * 100);
}

export function toYuan(cents: number): number {
  return Math.round(cents) / 100;
}
```

- [ ] **Step 3: 运行测试验证通过**

Run: `npx jest src/common/utils/money.utils.spec.ts` — Expected: PASS。

- [ ] **Step 4: 编写失败测试（日期工具）**

Create `backend/src/common/utils/date.utils.spec.ts`:

```typescript
import { formatDate, isHoliday, isWeekend, parseDate } from './date.utils';

describe('date.utils', () => {
  it('formats and parses YYYY-MM-DD', () => {
    const d = parseDate('2026-08-06');
    expect(formatDate(d)).toBe('2026-08-06');
  });
  it('detects weekend', () => {
    expect(isWeekend(parseDate('2026-08-08'))).toBe(true); // Saturday
    expect(isWeekend(parseDate('2026-08-06'))).toBe(false); // Thursday
  });
  it('detects national holiday', () => {
    expect(isHoliday(parseDate('2026-10-01'))).toBe(true); // National Day
    expect(isHoliday(parseDate('2026-08-06'))).toBe(false);
  });
});
```

Run: `npx jest src/common/utils/date.utils.spec.ts` — Expected: FAIL。

- [ ] **Step 5: 实现日期工具**

Create `backend/src/common/utils/date.utils.ts`:

```typescript
const HOLIDAYS_2026 = new Set([
  '2026-01-01', '2026-01-02', '2026-01-03', // 元旦
  '2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', // 春节
  '2026-04-04', '2026-04-05', '2026-04-06', // 清明
  '2026-05-01', '2026-05-02', '2026-05-03', // 劳动节
  '2026-06-19', // 端午
  '2026-09-25', // 中秋
  '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', // 国庆
]);

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isHoliday(date: Date): boolean {
  return HOLIDAYS_2026.has(formatDate(date));
}
```

- [ ] **Step 6: 运行测试验证通过**

Run: `npx jest src/common/utils/date.utils.spec.ts` — Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add work/dreamer-v2/backend/src/common/utils
git commit -m "feat: money and date utils for rental pricing"
```

---

### Task 2: 场地实体与管理 API

**Files:**
- Create: `work/dreamer-v2/backend/src/modules/rental/entities/studio.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/rental/dto/save-studio.dto.ts`
- Create: `work/dreamer-v2/backend/src/modules/rental/studio.service.ts`
- Create: `work/dreamer-v2/backend/src/modules/rental/studio.controller.ts`
- Create: `work/dreamer-v2/backend/src/modules/rental/studio.service.spec.ts`
- Create: `work/dreamer-v2/backend/src/modules/rental/rental.module.ts`
- Modify: `work/dreamer-v2/backend/src/app.module.ts`

**Interfaces:**
- Consumes: Task 1 工具、`BaseService`、`BaseController`、`JwtAuthGuard`、`PermissionsGuard`
- Produces:
  - `Studio` 实体：`id`(int PK)、`name`、`address`、`images`(JSON 数组字符串)、`description`、`weekdayPriceCents`、`weekendPriceCents`、`holidayPriceCents`、`depositCents`、`enabled`(boolean)、`sort`、`createdAt`、`updatedAt`
  - `StudioService`（extends BaseService）：重写 `page` 使列表返回 `toYuan` 后的价格字段 `weekdayPrice/weekendPrice/holidayPrice/deposit`
  - `RentalModule`：`TypeOrmModule.forFeature([Studio])` + providers + controllers，导出 `StudioService`
  - 接口：`GET/POST /api/rental/studios`、`GET/PUT/DELETE /api/rental/studios/:id`（权限码 `rental:studio:list/create/update/delete`）

- [ ] **Step 1: 编写失败测试（StudioService 价格换算）**

Create `backend/src/modules/rental/studio.service.spec.ts`:

```typescript
import { StudioService } from './studio.service';

describe('StudioService', () => {
  const repo: any = {
    findAndCount: jest.fn().mockResolvedValue([
      [{ id: 1, name: 'A棚', weekdayPriceCents: 10000, weekendPriceCents: 15000, holidayPriceCents: 20000, depositCents: 5000, enabled: true }],
      1,
    ]),
  };
  const service = new StudioService(repo);

  it('page converts cents to yuan', async () => {
    const res = await service.page(1, 10);
    expect(res.list[0].weekdayPrice).toBe(100);
    expect(res.list[0].weekendPrice).toBe(150);
    expect(res.list[0].deposit).toBe(50);
  });
});
```

Run: `npx jest src/modules/rental/studio.service.spec.ts` — Expected: FAIL。

- [ ] **Step 2: 创建 Studio 实体**

Create `backend/src/modules/rental/entities/studio.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('studio')
export class Studio {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 128 })
  name!: string;

  @Column({ length: 255, nullable: true })
  address?: string;

  @Column({ type: 'text', nullable: true })
  images?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'weekday_price_cents', type: 'int', default: 0 })
  weekdayPriceCents!: number;

  @Column({ name: 'weekend_price_cents', type: 'int', default: 0 })
  weekendPriceCents!: number;

  @Column({ name: 'holiday_price_cents', type: 'int', default: 0 })
  holidayPriceCents!: number;

  @Column({ name: 'deposit_cents', type: 'int', default: 0 })
  depositCents!: number;

  @Column({ default: true })
  enabled!: boolean;

  @Column({ default: 0 })
  sort!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
```

- [ ] **Step 3: 创建 DTO**

Create `backend/src/modules/rental/dto/save-studio.dto.ts`:

```typescript
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SaveStudioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  images?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  weekdayPriceYuan!: number;

  @IsInt()
  weekendPriceYuan!: number;

  @IsInt()
  holidayPriceYuan!: number;

  @IsInt()
  depositYuan!: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  sort?: number;
}
```

- [ ] **Step 4: 实现 StudioService**

Create `backend/src/modules/rental/studio.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../common/base/base.service';
import { PageResult } from '../../common/base/page-result';
import { toCents, toYuan } from '../../common/utils/money.utils';
import { Studio } from './entities/studio.entity';
import { SaveStudioDto } from './dto/save-studio.dto';

@Injectable()
export class StudioService extends BaseService<Studio> {
  constructor(@InjectRepository(Studio) repo: Repository<Studio>) {
    super(repo);
  }

  async page(page = 1, pageSize = 10): Promise<PageResult<any>> {
    const result = await super.page(page, pageSize);
    return {
      ...result,
      list: result.list.map((s) => this.toPublic(s)),
    };
  }

  async findOne(id: number): Promise<any> {
    return this.toPublic(await super.findOne(id));
  }

  async create(dto: SaveStudioDto): Promise<any> {
    const entity = this.repo.create({
      ...dto,
      weekdayPriceCents: toCents(dto.weekdayPriceYuan),
      weekendPriceCents: toCents(dto.weekendPriceYuan),
      holidayPriceCents: toCents(dto.holidayPriceYuan),
      depositCents: toCents(dto.depositYuan),
    });
    return this.toPublic(await this.repo.save(entity));
  }

  async update(id: number, dto: SaveStudioDto): Promise<any> {
    const entity = await super.findOne(id);
    Object.assign(entity, dto, {
      weekdayPriceCents: toCents(dto.weekdayPriceYuan),
      weekendPriceCents: toCents(dto.weekendPriceYuan),
      holidayPriceCents: toCents(dto.holidayPriceYuan),
      depositCents: toCents(dto.depositYuan),
    });
    return this.toPublic(await this.repo.save(entity));
  }

  private toPublic(s: Studio): any {
    return {
      id: s.id,
      name: s.name,
      address: s.address,
      images: s.images,
      description: s.description,
      weekdayPrice: toYuan(s.weekdayPriceCents),
      weekendPrice: toYuan(s.weekendPriceCents),
      holidayPrice: toYuan(s.holidayPriceCents),
      deposit: toYuan(s.depositCents),
      enabled: s.enabled,
      sort: s.sort,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }
}
```

- [ ] **Step 5: 运行测试验证通过**

Run: `npx jest src/modules/rental/studio.service.spec.ts` — Expected: PASS。

- [ ] **Step 6: 创建 StudioController**

Create `backend/src/modules/rental/studio.controller.ts`:

```typescript
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
```

- [ ] **Step 7: 创建 RentalModule 并注册**

Create `backend/src/modules/rental/rental.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Studio } from './entities/studio.entity';
import { StudioService } from './studio.service';
import { StudioController } from './studio.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Studio])],
  controllers: [StudioController],
  providers: [StudioService],
  exports: [StudioService],
})
export class RentalModule {}
```

Modify `backend/src/app.module.ts`：`import { RentalModule } from './modules/rental/rental.module';` 并加入 imports 数组。

- [ ] **Step 8: 验证构建与全量测试**

Run: `npm run build && npm test`
Expected: build 成功；全部测试通过（含新增）。

- [ ] **Step 9: 提交**

```bash
git add work/dreamer-v2/backend/src/modules/rental work/dreamer-v2/backend/src/app.module.ts
git commit -m "feat: studio entity and management api"
```

---

### Task 3: 时间段档期与可用性查询

**Files:**
- Create: `work/dreamer-v2/backend/src/modules/rental/entities/time-slot.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/rental/dto/save-time-slot.dto.ts`
- Create: `work/dreamer-v2/backend/src/modules/rental/time-slot.service.ts`
- Create: `work/dreamer-v2/backend/src/modules/rental/time-slot.controller.ts`
- Create: `work/dreamer-v2/backend/src/modules/rental/time-slot.service.spec.ts`
- Modify: `work/dreamer-v2/backend/src/modules/rental/rental.module.ts`

**Interfaces:**
- Consumes: Task 2 的 `RentalModule`、Studio 实体
- Produces:
  - `TimeSlot` 实体：`id`、`studioId`(int, 索引)、`startTime`(`HH:mm`)、`endTime`(`HH:mm`)、`enabled`(boolean)、`createdAt`
  - `TimeSlotService`：`listByStudio(studioId)`、`saveMany(studioId, dto[])`（先删后插，事务）、`findEnabledByStudio(studioId)`
  - `GET /api/rental/studios/:id/time-slots`、`PUT /api/rental/studios/:id/time-slots`（权限码 `rental:studio:update`）

- [ ] **Step 1: 编写失败测试（TimeSlotService 保存与查询）**

Create `backend/src/modules/rental/time-slot.service.spec.ts`:

```typescript
import { TimeSlotService } from './time-slot.service';

describe('TimeSlotService', () => {
  const repo: any = {
    find: jest.fn(),
    delete: jest.fn(),
    create: jest.fn((dto: any) => dto),
    save: jest.fn(async (e: any) => e),
  };
  const service = new TimeSlotService(repo);

  it('findEnabledByStudio filters enabled', async () => {
    repo.find.mockResolvedValue([
      { id: 1, studioId: 1, startTime: '09:00', endTime: '10:00', enabled: true },
      { id: 2, studioId: 1, startTime: '10:00', endTime: '11:00', enabled: false },
    ]);
    const list = await service.findEnabledByStudio(1);
    expect(list).toHaveLength(1);
    expect(list[0].startTime).toBe('09:00');
  });
});
```

Run: `npx jest src/modules/rental/time-slot.service.spec.ts` — Expected: FAIL。

- [ ] **Step 2: 创建 TimeSlot 实体与 DTO**

Create `backend/src/modules/rental/entities/time-slot.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('time_slot')
export class TimeSlot {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'studio_id', type: 'int' })
  studioId!: number;

  @Column({ name: 'start_time', length: 5 })
  startTime!: string;

  @Column({ name: 'end_time', length: 5 })
  endTime!: string;

  @Column({ default: true })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

Create `backend/src/modules/rental/dto/save-time-slot.dto.ts`:

```typescript
import { IsArray, IsBoolean, IsOptional, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TimeSlotItemDto {
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class SaveTimeSlotsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotItemDto)
  slots!: TimeSlotItemDto[];
}
```

- [ ] **Step 3: 实现 TimeSlotService**

Create `backend/src/modules/rental/time-slot.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TimeSlot } from './entities/time-slot.entity';
import { SaveTimeSlotsDto } from './dto/save-time-slot.dto';

@Injectable()
export class TimeSlotService {
  constructor(
    @InjectRepository(TimeSlot) private readonly repo: Repository<TimeSlot>,
    private readonly dataSource: DataSource,
  ) {}

  listByStudio(studioId: number): Promise<TimeSlot[]> {
    return this.repo.find({ where: { studioId }, order: { startTime: 'ASC' } });
  }

  findEnabledByStudio(studioId: number): Promise<TimeSlot[]> {
    return this.repo.find({ where: { studioId, enabled: true }, order: { startTime: 'ASC' } });
  }

  async saveMany(studioId: number, dto: SaveTimeSlotsDto): Promise<TimeSlot[]> {
    return this.dataSource.transaction(async (manager) => {
      await manager.delete(TimeSlot, { studioId });
      const entities = dto.slots.map((s) =>
        manager.create(TimeSlot, { studioId, startTime: s.startTime, endTime: s.endTime, enabled: s.enabled ?? true }),
      );
      return manager.save(entities);
    });
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx jest src/modules/rental/time-slot.service.spec.ts` — Expected: PASS。

- [ ] **Step 5: 创建 TimeSlotController 并注册**

Create `backend/src/modules/rental/time-slot.controller.ts`:

```typescript
import { Body, Controller, Get, Param, ParseIntPipe, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { TimeSlotService } from './time-slot.service';
import { SaveTimeSlotsDto } from './dto/save-time-slot.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('rental/studios/:studioId/time-slots')
export class TimeSlotController {
  constructor(private readonly timeSlotService: TimeSlotService) {}

  @Get()
  @Permissions('rental:studio:list')
  list(@Param('studioId', ParseIntPipe) studioId: number) {
    return this.timeSlotService.listByStudio(studioId);
  }

  @Put()
  @Permissions('rental:studio:update')
  save(@Param('studioId', ParseIntPipe) studioId: number, @Body() dto: SaveTimeSlotsDto) {
    return this.timeSlotService.saveMany(studioId, dto);
  }
}
```

Modify `rental.module.ts`：加入 `TimeSlot` 实体、`TimeSlotService`、`TimeSlotController`。

- [ ] **Step 6: 验证构建与测试**

Run: `npm run build && npm test`
Expected: 通过。

- [ ] **Step 7: 提交**

```bash
git add work/dreamer-v2/backend/src/modules/rental
git commit -m "feat: time slot management and availability query"
```

---

### Task 4: 预订下单（防重复 + 金额计算 + 押金）

**Files:**
- Create: `work/dreamer-v2/backend/src/modules/rental/entities/booking.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/rental/entities/booking-time-slot.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/rental/dto/create-booking.dto.ts`
- Create: `work/dreamer-v2/backend/src/modules/rental/booking.service.ts`
- Create: `work/dreamer-v2/backend/src/modules/rental/booking.service.spec.ts`
- Create: `work/dreamer-v2/backend/src/modules/rental/booking.controller.ts`
- Modify: `work/dreamer-v2/backend/src/modules/rental/rental.module.ts`

**Interfaces:**
- Consumes: Task 1 工具、Task 2/3 实体与服务、`RedisService`
- Produces:
  - `Booking`：`id`、`bookingNo`(unique)、`studioId`、`customerName`、`customerPhone`、`bookingDate`(`YYYY-MM-DD`)、`status`(`pending|paid|checked|completed|cancelled|refunded`)、`slotCount`、`unitPriceCents`、`totalAmountCents`、`depositCents`、`depositRefunded`(boolean)、`remark`、`createdAt`、`updatedAt`
  - `BookingTimeSlot` 关联表：`bookingId`、`timeSlotId`、`startTime`、`endTime`
  - `BookingService.create(dto)`：查场地（不存在抛 40400）→ 校验日期与时段 → Redis 锁 `rental:lock:{studioId}:{date}` → 事务内查已占用时段 → 冲突抛 `BusinessException('该时段已被预订', 40900)` → 计算金额（节假日优先、周末次之、工作日兜底）× slotCount → 创建订单
  - `POST /api/rental/bookings`（公开，无 JWT 守卫，H5 用户端使用）；后台列表接口带守卫

- [ ] **Step 1: 编写失败测试（BookingService 金额与冲突）**

Create `backend/src/modules/rental/booking.service.spec.ts`:

```typescript
import { BookingService } from './booking.service';
import { BusinessException } from '../../common/exceptions/business.exception';

describe('BookingService', () => {
  const studioRepo: any = { findOneBy: jest.fn() };
  const bookingRepo: any = {
    create: jest.fn((d: any) => d),
    save: jest.fn(async (e: any) => ({ ...e, id: 1 })),
  };
  const slotRepo: any = { find: jest.fn() };
  const btsRepo: any = { create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const dataSource: any = {
    transaction: jest.fn(async (fn: any) => fn({ delete: jest.fn(), findOneBy: jest.fn(), create: jest.fn(), save: jest.fn() })),
  };
  const redis: any = { get: jest.fn().mockResolvedValue(null), set: jest.fn(), del: jest.fn() };
  const service = new BookingService(studioRepo, bookingRepo, slotRepo, btsRepo, dataSource, redis);

  it('calculates holiday price first', async () => {
    studioRepo.findOneBy.mockResolvedValue({
      id: 1,
      weekdayPriceCents: 10000,
      weekendPriceCents: 15000,
      holidayPriceCents: 20000,
      depositCents: 5000,
    });
    slotRepo.find.mockResolvedValue([{ id: 1, startTime: '09:00', endTime: '10:00' }]);
    const dto = {
      studioId: 1,
      customerName: '张三',
      customerPhone: '13800000000',
      bookingDate: '2026-10-01',
      timeSlotIds: [1],
    };
    const res = await service.create(dto as any);
    expect(res.totalAmountCents).toBe(20000);
    expect(res.depositCents).toBe(5000);
    expect(res.unitPriceCents).toBe(20000);
  });
});
```

Run: `npx jest src/modules/rental/booking.service.spec.ts` — Expected: FAIL。

- [ ] **Step 2: 创建实体**

Create `backend/src/modules/rental/entities/booking.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('booking')
export class Booking {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'booking_no', unique: true, length: 32 })
  bookingNo!: string;

  @Index()
  @Column({ name: 'studio_id', type: 'int' })
  studioId!: number;

  @Column({ name: 'customer_name', length: 64 })
  customerName!: string;

  @Column({ name: 'customer_phone', length: 20 })
  customerPhone!: string;

  @Index()
  @Column({ name: 'booking_date', length: 10 })
  bookingDate!: string;

  @Column({ length: 16, default: 'pending' })
  status!: string;

  @Column({ name: 'slot_count', type: 'int', default: 0 })
  slotCount!: number;

  @Column({ name: 'unit_price_cents', type: 'int', default: 0 })
  unitPriceCents!: number;

  @Column({ name: 'total_amount_cents', type: 'int', default: 0 })
  totalAmountCents!: number;

  @Column({ name: 'deposit_cents', type: 'int', default: 0 })
  depositCents!: number;

  @Column({ name: 'deposit_refunded', default: false })
  depositRefunded!: boolean;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
```

Create `backend/src/modules/rental/entities/booking-time-slot.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('booking_time_slot')
export class BookingTimeSlot {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'booking_id', type: 'int' })
  bookingId!: number;

  @Index()
  @Column({ name: 'time_slot_id', type: 'int' })
  timeSlotId!: number;

  @Column({ name: 'start_time', length: 5 })
  startTime!: string;

  @Column({ name: 'end_time', length: 5 })
  endTime!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

- [ ] **Step 3: 创建 DTO**

Create `backend/src/modules/rental/dto/create-booking.dto.ts`:

```typescript
import { ArrayNotEmpty, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateBookingDto {
  @IsInt()
  studioId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  customerName!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^1\d{10}$/)
  customerPhone!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  bookingDate!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  timeSlotIds!: number[];

  @IsOptional()
  @IsString()
  remark?: string;
}
```

- [ ] **Step 4: 实现 BookingService**

Create `backend/src/modules/rental/booking.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { RedisService } from '../../common/redis/redis.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { formatDate, isHoliday, isWeekend, parseDate } from '../../common/utils/date.utils';
import { Studio } from './entities/studio.entity';
import { Booking } from './entities/booking.entity';
import { BookingTimeSlot } from './entities/booking-time-slot.entity';
import { TimeSlot } from './entities/time-slot.entity';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Studio) private readonly studioRepo: Repository<Studio>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(TimeSlot) private readonly slotRepo: Repository<TimeSlot>,
    @InjectRepository(BookingTimeSlot) private readonly btsRepo: Repository<BookingTimeSlot>,
    private readonly dataSource: DataSource,
    private readonly redis: RedisService,
  ) {}

  async create(dto: CreateBookingDto): Promise<Booking> {
    const studio = await this.studioRepo.findOneBy({ id: dto.studioId, enabled: true });
    if (!studio) throw new BusinessException('场地不存在或已下架', 40400);

    const date = parseDate(dto.bookingDate);
    if (date < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) {
      throw new BusinessException('不能预订过去的日期', 40020);
    }

    const slots = await this.slotRepo.findBy({ id: In(dto.timeSlotIds), studioId: dto.studioId, enabled: true });
    if (slots.length !== dto.timeSlotIds.length) {
      throw new BusinessException('部分时段无效或已停用', 40021);
    }

    const lockKey = `rental:lock:${dto.studioId}:${dto.bookingDate}`;
    const locked = await this.redis.get(lockKey);
    if (locked) throw new BusinessException('该日期正在被其他人预订，请重试', 40901);
    await this.redis.set(lockKey, '1', 15);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const active = await manager.find(BookingTimeSlot, {
          where: { timeSlotId: In(dto.timeSlotIds) },
        });
        if (active.length) {
          const bookingIds = [...new Set(active.map((b) => b.bookingId))];
          const bookings = await manager.findBy(Booking, {
            id: In(bookingIds),
            bookingDate: dto.bookingDate,
            status: In(['pending', 'paid', 'checked']),
          });
          if (bookings.length) throw new BusinessException('该时段已被预订', 40900);
        }

        const unitPriceCents = isHoliday(date)
          ? studio.holidayPriceCents
          : isWeekend(date)
            ? studio.weekendPriceCents
            : studio.weekdayPriceCents;
        const slotCount = slots.length;
        const bookingNo = `B${formatDate(new Date()).replace(/-/g, '')}${Date.now().toString(36).toUpperCase()}`;
        const booking = manager.create(Booking, {
          bookingNo,
          studioId: studio.id,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          bookingDate: dto.bookingDate,
          status: 'pending',
          slotCount,
          unitPriceCents,
          totalAmountCents: unitPriceCents * slotCount,
          depositCents: studio.depositCents,
          remark: dto.remark,
        });
        const saved = await manager.save(booking);
        await manager.save(
          slots.map((s) =>
            manager.create(BookingTimeSlot, {
              bookingId: saved.id,
              timeSlotId: s.id,
              startTime: s.startTime,
              endTime: s.endTime,
            }),
          ),
        );
        return saved;
      });
    } finally {
      await this.redis.del(lockKey);
    }
  }
}
```

- [ ] **Step 5: 运行测试验证通过**

Run: `npx jest src/modules/rental/booking.service.spec.ts` — Expected: PASS。

- [ ] **Step 6: 创建 BookingController（公开创建 + 后台列表）**

Create `backend/src/modules/rental/booking.controller.ts`:

```typescript
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('rental/bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  create(@Body() dto: CreateBookingDto) {
    return this.bookingService.create(dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  @Permissions('rental:booking:list')
  page(@Query('page') page = 1, @Query('pageSize') pageSize = 10, @Query('status') status?: string) {
    return this.bookingService.page(Number(page), Number(pageSize), status);
  }
}
```

注意：`BookingService.page(page, pageSize, status)` 需在 Task 5 中实现；本任务先加最小实现（无 status 过滤）以通过构建。

在 `booking.service.ts` 补最小分页：

```typescript
async page(page = 1, pageSize = 10, status?: string): Promise<{ list: Booking[]; total: number; page: number; pageSize: number }> {
  const where = status ? { status } : {};
  const [list, total] = await this.bookingRepo.findAndCount({
    where,
    take: pageSize,
    skip: (page - 1) * pageSize,
    order: { createdAt: 'DESC' },
  });
  return { list, total, page, pageSize };
}
```

Modify `rental.module.ts`：注册 `Booking`、`BookingTimeSlot`、`TimeSlot` 实体及 `BookingService`、`BookingController`。

- [ ] **Step 7: 验证构建与测试**

Run: `npm run build && npm test`
Expected: 通过。

- [ ] **Step 8: 提交**

```bash
git add work/dreamer-v2/backend/src/modules/rental
git commit -m "feat: booking creation with conflict lock and pricing"
```

---

### Task 5: 订单状态流转（支付/核销/取消/退款）

**Files:**
- Create: `work/dreamer-v2/backend/src/modules/rental/booking-lifecycle.service.ts`
- Create: `work/dreamer-v2/backend/src/modules/rental/booking-lifecycle.service.spec.ts`
- Modify: `work/dreamer-v2/backend/src/modules/rental/booking.controller.ts`
- Modify: `work/dreamer-v2/backend/src/modules/rental/booking.service.ts`

**Interfaces:**
- Consumes: Task 4 的 Booking 实体与服务
- Produces:
  - `BookingLifecycleService`：`pay(id)`（pending→paid）、`checkIn(id)`（paid→checked）、`complete(id)`（checked→completed，`depositRefunded=true` 模拟退还）、`cancel(id)`（pending→cancelled）、`refund(id)`（paid→refunded）
  - 非法状态转换抛 `BusinessException('当前状态不允许该操作', 40910)`
  - 接口（带守卫 + 权限码）：`POST /api/rental/bookings/:id/pay|check-in|complete|cancel|refund`

- [ ] **Step 1: 编写失败测试（状态机）**

Create `backend/src/modules/rental/booking-lifecycle.service.spec.ts`:

```typescript
import { BookingLifecycleService } from './booking-lifecycle.service';
import { BusinessException } from '../../common/exceptions/business.exception';

describe('BookingLifecycleService', () => {
  const repo: any = {
    findOneBy: jest.fn(),
    save: jest.fn(async (e: any) => e),
  };
  const service = new BookingLifecycleService(repo);

  it('pay transitions pending to paid', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, status: 'pending' });
    const res = await service.pay(1);
    expect(res.status).toBe('paid');
  });

  it('rejects paying a cancelled booking', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, status: 'cancelled' });
    await expect(service.pay(1)).rejects.toThrow(BusinessException);
  });

  it('complete refunds deposit', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, status: 'checked', depositRefunded: false });
    const res = await service.complete(1);
    expect(res.status).toBe('completed');
    expect(res.depositRefunded).toBe(true);
  });
});
```

Run: `npx jest src/modules/rental/booking-lifecycle.service.spec.ts` — Expected: FAIL。

- [ ] **Step 2: 实现状态机服务**

Create `backend/src/modules/rental/booking-lifecycle.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Booking } from './entities/booking.entity';

const TRANSITIONS: Record<string, string[]> = {
  pay: ['pending'],
  'check-in': ['paid'],
  complete: ['checked'],
  cancel: ['pending'],
  refund: ['paid'],
};

@Injectable()
export class BookingLifecycleService {
  constructor(@InjectRepository(Booking) private readonly repo: Repository<Booking>) {}

  private async transition(id: number, action: string, toStatus: string): Promise<Booking> {
    const booking = await this.repo.findOneBy({ id });
    if (!booking) throw new BusinessException('订单不存在', 40400);
    if (!TRANSITIONS[action].includes(booking.status)) {
      throw new BusinessException('当前状态不允许该操作', 40910);
    }
    booking.status = toStatus;
    if (toStatus === 'completed') booking.depositRefunded = true;
    return this.repo.save(booking);
  }

  pay(id: number): Promise<Booking> {
    return this.transition(id, 'pay', 'paid');
  }

  checkIn(id: number): Promise<Booking> {
    return this.transition(id, 'check-in', 'checked');
  }

  complete(id: number): Promise<Booking> {
    return this.transition(id, 'complete', 'completed');
  }

  cancel(id: number): Promise<Booking> {
    return this.transition(id, 'cancel', 'cancelled');
  }

  refund(id: number): Promise<Booking> {
    return this.transition(id, 'refund', 'refunded');
  }
}
```

- [ ] **Step 3: 运行测试验证通过**

Run: `npx jest src/modules/rental/booking-lifecycle.service.spec.ts` — Expected: PASS。

- [ ] **Step 4: 控制器加状态流转接口**

Modify `booking.controller.ts`，注入 `BookingLifecycleService` 并加：

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Post(':id/pay')
@Permissions('rental:booking:check')
pay(@Param('id', ParseIntPipe) id: number) {
  return this.lifecycle.pay(id);
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Post(':id/check-in')
@Permissions('rental:booking:check')
checkIn(@Param('id', ParseIntPipe) id: number) {
  return this.lifecycle.checkIn(id);
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Post(':id/complete')
@Permissions('rental:booking:check')
complete(@Param('id', ParseIntPipe) id: number) {
  return this.lifecycle.complete(id);
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Post(':id/cancel')
@Permissions('rental:booking:cancel')
cancel(@Param('id', ParseIntPipe) id: number) {
  return this.lifecycle.cancel(id);
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Post(':id/refund')
@Permissions('rental:booking:refund')
refund(@Param('id', ParseIntPipe) id: number) {
  return this.lifecycle.refund(id);
}
```

Modify `rental.module.ts`：注册 `BookingLifecycleService`。

- [ ] **Step 5: 验证构建与测试**

Run: `npm run build && npm test`
Expected: 通过。

- [ ] **Step 6: 提交**

```bash
git add work/dreamer-v2/backend/src/modules/rental
git commit -m "feat: booking state machine (pay/check-in/complete/cancel/refund)"
```

---

### Task 6: 日历占用查询（后台日历视图数据源）

**Files:**
- Create: `work/dreamer-v2/backend/src/modules/rental/booking.service.spec.ts` 追加用例
- Modify: `work/dreamer-v2/backend/src/modules/rental/booking.service.ts`
- Modify: `work/dreamer-v2/backend/src/modules/rental/booking.controller.ts`

**Interfaces:**
- Consumes: Task 4 实体
- Produces:
  - `BookingService.calendar(studioId, month: 'YYYY-MM')`：返回该月每日占用时段数组 `{ date, occupiedTimeSlotIds: number[], bookings: [{id, bookingNo, customerName, customerPhone, status, timeSlotIds}] }`
  - `GET /api/rental/studios/:studioId/calendar?month=YYYY-MM`（权限码 `rental:booking:list`）

- [ ] **Step 1: 追加失败测试（calendar）**

Modify `booking.service.spec.ts`，在 describe 内追加：

```typescript
  it('calendar groups bookings by date', async () => {
    const btsRepo2: any = { create: jest.fn(), save: jest.fn() };
    const bookingRepo2: any = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn().mockResolvedValue([
        { id: 1, bookingNo: 'B1', customerName: '张三', customerPhone: '13800000000', status: 'paid', bookingDate: '2026-10-01' },
        { id: 2, bookingNo: 'B2', customerName: '李四', customerPhone: '13900000000', status: 'checked', bookingDate: '2026-10-02' },
      ]),
      findAndCount: jest.fn(),
    };
    const btsRepoFind: any = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn().mockResolvedValue([
        { bookingId: 1, timeSlotId: 11 },
        { bookingId: 2, timeSlotId: 21 },
      ]),
    };
    const service2 = new BookingService(studioRepo, bookingRepo2, slotRepo, btsRepoFind, dataSource, redis);
    const cal = await service2.calendar(1, '2026-10');
    expect(cal).toHaveLength(2);
    expect(cal[0].date).toBe('2026-10-01');
    expect(cal[0].bookings[0].timeSlotIds).toEqual([11]);
  });
```

Run: `npx jest src/modules/rental/booking.service.spec.ts` — Expected: FAIL（`calendar` 不存在）。

- [ ] **Step 2: 实现 calendar 方法**

Modify `booking.service.ts`，追加：

```typescript
async calendar(studioId: number, month: string): Promise<any[]> {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const dates: string[] = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    dates.push(formatDate(new Date(d)));
  }
  const bookings = await this.bookingRepo.find({
    where: { studioId, bookingDate: In(dates), status: In(['pending', 'paid', 'checked', 'completed']) },
  });
  if (!bookings.length) return dates.map((date) => ({ date, occupiedTimeSlotIds: [], bookings: [] }));
  const links = await this.btsRepo.find({ where: { bookingId: In(bookings.map((b) => b.id)) } });
  const byDate = new Map<string, any[]>();
  bookings.forEach((b) => {
    const slots = links.filter((l) => l.bookingId === b.id).map((l) => l.timeSlotId);
    const entry = { id: b.id, bookingNo: b.bookingNo, customerName: b.customerName, customerPhone: b.customerPhone, status: b.status, timeSlotIds: slots };
    const arr = byDate.get(b.bookingDate) || [];
    arr.push(entry);
    byDate.set(b.bookingDate, arr);
  });
  return dates.map((date) => ({
    date,
    occupiedTimeSlotIds: (byDate.get(date) || []).flatMap((b) => b.timeSlotIds),
    bookings: byDate.get(date) || [],
  }));
}
```

- [ ] **Step 3: 运行测试验证通过**

Run: `npx jest src/modules/rental/booking.service.spec.ts` — Expected: PASS。

- [ ] **Step 4: 控制器加日历接口**

Modify `booking.controller.ts` 或新建 `calendar.controller.ts`（本计划直接在 BookingController 增加，注意路由顺序：`@Controller('rental/studios/:studioId/calendar')` 放独立 controller）：

Create `backend/src/modules/rental/calendar.controller.ts`:

```typescript
import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { BookingService } from './booking.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('rental/studios/:studioId/calendar')
export class CalendarController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  @Permissions('rental:booking:list')
  calendar(@Param('studioId', ParseIntPipe) studioId: number, @Query('month') month: string) {
    return this.bookingService.calendar(studioId, month);
  }
}
```

Modify `rental.module.ts`：注册 `CalendarController`。

- [ ] **Step 5: 验证构建与测试**

Run: `npm run build && npm test`
Expected: 通过。

- [ ] **Step 6: 提交**

```bash
git add work/dreamer-v2/backend/src/modules/rental
git commit -m "feat: booking calendar query for admin"
```

---

### Task 7: 管理后台租赁页面（场地 / 时段 / 订单 / 日历）

**Files:**
- Create: `work/dreamer-v2/admin/src/api/rental.ts`
- Create: `work/dreamer-v2/admin/src/views/rental/StudioList.vue`
- Create: `work/dreamer-v2/admin/src/views/rental/StudioForm.vue`
- Create: `work/dreamer-v2/admin/src/views/rental/TimeSlotManage.vue`
- Create: `work/dreamer-v2/admin/src/views/rental/BookingList.vue`
- Create: `work/dreamer-v2/admin/src/views/rental/BookingCalendar.vue`
- Modify: `work/dreamer-v2/admin/src/router/index.ts`
- Modify: `work/dreamer-v2/admin/src/layout/Layout.vue`（如需要菜单分组；后端菜单已含「租赁管理」目录）

**Interfaces:**
- Consumes: 后端接口 `rental/studios`、`rental/studios/:id/time-slots`、`rental/bookings`、`rental/studios/:id/calendar`
- Produces:
  - `rentalApi`：`studioPage/createStudio/updateStudio/deleteStudio/listTimeSlots/saveTimeSlots/bookingPage/bookingAction/calendar`
  - 四个页面：场地列表（表格+上下架）、场地编辑（价格表单）、时段管理（可增删的时段编辑器）、订单列表（状态筛选 + 支付/核销/完成/取消/退款按钮）、日历（月份选择 + 每日占用时段红点/列表）

- [ ] **Step 1: 创建 api/rental.ts**

Create `admin/src/api/rental.ts`:

```typescript
import request from './request';

export const rentalApi = {
  studioPage: (page: number, pageSize: number) => request.get('/rental/studios', { params: { page, pageSize } }),
  createStudio: (data: any) => request.post('/rental/studios', data),
  updateStudio: (id: number, data: any) => request.put(`/rental/studios/${id}`, data),
  deleteStudio: (id: number) => request.delete(`/rental/studios/${id}`),

  listTimeSlots: (studioId: number) => request.get(`/rental/studios/${studioId}/time-slots`),
  saveTimeSlots: (studioId: number, slots: any[]) => request.put(`/rental/studios/${studioId}/time-slots`, { slots }),

  bookingPage: (params: any) => request.get('/rental/bookings', { params }),
  bookingAction: (id: number, action: string) => request.post(`/rental/bookings/${id}/${action}`),
  calendar: (studioId: number, month: string) => request.get(`/rental/studios/${studioId}/calendar`, { params: { month } }),
};
```

- [ ] **Step 2: 场地列表页**

Create `admin/src/views/rental/StudioList.vue`：

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { rentalApi } from '../../api/rental';

const router = useRouter();
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);

async function load() {
  const res: any = await rentalApi.studioPage(page.value, pageSize.value);
  list.value = res.list;
  total.value = res.total;
}

async function toggleEnabled(row: any) {
  await rentalApi.updateStudio(row.id, { ...row, enabled: !row.enabled });
  ElMessage.success('已更新');
  load();
}

async function remove(row: any) {
  await ElMessageBox.confirm(`确定删除场地「${row.name}」？`, '提示');
  await rentalApi.deleteStudio(row.id);
  ElMessage.success('已删除');
  load();
}

onMounted(load);
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>场地管理</h3>
      <el-button type="primary" @click="router.push('/rental/studio/new')">新增场地</el-button>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="address" label="地址" />
      <el-table-column label="工作日价" width="100">
        <template #default="{ row }">¥{{ row.weekdayPrice }}</template>
      </el-table-column>
      <el-table-column label="周末价" width="100">
        <template #default="{ row }">¥{{ row.weekendPrice }}</template>
      </el-table-column>
      <el-table-column label="节假日价" width="100">
        <template #default="{ row }">¥{{ row.holidayPrice }}</template>
      </el-table-column>
      <el-table-column label="押金" width="90">
        <template #default="{ row }">¥{{ row.deposit }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">{{ row.enabled ? '上架' : '下架' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button link type="primary" @click="router.push(`/rental/studio/${row.id}`)">编辑</el-button>
          <el-button link type="primary" @click="router.push(`/rental/studio/${row.id}/slots`)">时段</el-button>
          <el-button link type="warning" @click="toggleEnabled(row)">{{ row.enabled ? '下架' : '上架' }}</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />
  </el-card>
</template>
```

- [ ] **Step 3: 场地编辑页（含价格表单）**

Create `admin/src/views/rental/StudioForm.vue`：

```vue
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { rentalApi } from '../../api/rental';

const route = useRoute();
const router = useRouter();
const id = route.params.id as string | undefined;
const form = reactive({
  name: '', address: '', description: '', images: '',
  weekdayPriceYuan: 0, weekendPriceYuan: 0, holidayPriceYuan: 0, depositYuan: 0,
  enabled: true, sort: 0,
});

onMounted(async () => {
  if (id && id !== 'new') {
    const data: any = await rentalApi.studioPage(1, 100).then((r: any) => r.list.find((s: any) => s.id === Number(id)));
    if (data) Object.assign(form, {
      name: data.name, address: data.address, description: data.description, images: data.images,
      weekdayPriceYuan: data.weekdayPrice, weekendPriceYuan: data.weekendPrice, holidayPriceYuan: data.holidayPrice,
      depositYuan: data.deposit, enabled: data.enabled, sort: data.sort,
    });
  }
});

async function submit() {
  if (id && id !== 'new') {
    await rentalApi.updateStudio(Number(id), form);
  } else {
    await rentalApi.createStudio(form);
  }
  ElMessage.success('保存成功');
  router.push('/rental/studios');
}
</script>

<template>
  <el-card>
    <h3>{{ id && id !== 'new' ? '编辑场地' : '新增场地' }}</h3>
    <el-form :model="form" label-width="120px" style="max-width: 560px">
      <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
      <el-form-item label="地址"><el-input v-model="form.address" /></el-form-item>
      <el-form-item label="图片URL"><el-input v-model="form.images" placeholder="逗号分隔多个URL" /></el-form-item>
      <el-form-item label="说明"><el-input v-model="form.description" type="textarea" /></el-form-item>
      <el-form-item label="工作日价(元)"><el-input-number v-model="form.weekdayPriceYuan" :min="0" /></el-form-item>
      <el-form-item label="周末价(元)"><el-input-number v-model="form.weekendPriceYuan" :min="0" /></el-form-item>
      <el-form-item label="节假日价(元)"><el-input-number v-model="form.holidayPriceYuan" :min="0" /></el-form-item>
      <el-form-item label="押金(元)"><el-input-number v-model="form.depositYuan" :min="0" /></el-form-item>
      <el-form-item label="排序"><el-input-number v-model="form.sort" /></el-form-item>
      <el-form-item label="上架"><el-switch v-model="form.enabled" /></el-form-item>
      <el-button type="primary" @click="submit">保存</el-button>
    </el-form>
  </el-card>
</template>
```

- [ ] **Step 4: 时段管理页**

Create `admin/src/views/rental/TimeSlotManage.vue`：

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { rentalApi } from '../../api/rental';

const route = useRoute();
const studioId = Number(route.params.id);
const slots = ref<any[]>([]);

onMounted(async () => {
  slots.value = (await rentalApi.listTimeSlots(studioId)) as any[];
});

function add() {
  slots.value.push({ startTime: '09:00', endTime: '10:00', enabled: true });
}

function remove(idx: number) {
  slots.value.splice(idx, 1);
}

async function save() {
  await rentalApi.saveTimeSlots(studioId, slots.value);
  ElMessage.success('时段已保存');
}
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>时段档期</h3>
      <div>
        <el-button @click="add">新增时段</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </div>
    </div>
    <el-table :data="slots" border>
      <el-table-column label="开始" width="140">
        <template #default="{ row }"><el-time-select v-model="row.startTime" start="00:00" end="23:30" step="00:30" /></template>
      </el-table-column>
      <el-table-column label="结束" width="140">
        <template #default="{ row }"><el-time-select v-model="row.endTime" start="00:30" end="23:59" step="00:30" /></template>
      </el-table-column>
      <el-table-column label="启用" width="100">
        <template #default="{ row }"><el-switch v-model="row.enabled" /></template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ $index }"><el-button link type="danger" @click="remove($index)">删除</el-button></template>
      </el-table-column>
    </el-table>
  </el-card>
</template>
```

- [ ] **Step 5: 订单列表页**

Create `admin/src/views/rental/BookingList.vue`：

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { rentalApi } from '../../api/rental';

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const status = ref('');
const statusMap: Record<string, string> = {
  pending: '待支付', paid: '已支付', checked: '已核销', completed: '已完成', cancelled: '已取消', refunded: '已退款',
};

async function load() {
  const res: any = await rentalApi.bookingPage({ page: page.value, pageSize: pageSize.value, status: status.value || undefined });
  list.value = res.list;
  total.value = res.total;
}

async function act(row: any, action: string, label: string) {
  await rentalApi.bookingAction(row.id, action);
  ElMessage.success(`${label}成功`);
  load();
}
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>订单管理</h3>
      <el-select v-model="status" placeholder="全部状态" clearable style="width: 140px" @change="load">
        <el-option v-for="(label, key) in statusMap" :key="key" :label="label" :value="key" />
      </el-select>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="bookingNo" label="订单号" width="200" />
      <el-table-column prop="customerName" label="客户" width="100" />
      <el-table-column prop="customerPhone" label="手机号" width="130" />
      <el-table-column prop="bookingDate" label="日期" width="110" />
      <el-table-column label="金额" width="100">
        <template #default="{ row }">¥{{ (row.totalAmountCents / 100).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="押金" width="90">
        <template #default="{ row }">¥{{ (row.depositCents / 100).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">{{ statusMap[row.status] || row.status }}</template>
      </el-table-column>
      <el-table-column label="操作" width="260">
        <template #default="{ row }">
          <el-button v-if="row.status === 'pending'" link type="primary" @click="act(row, 'pay', '支付')">支付</el-button>
          <el-button v-if="row.status === 'paid'" link type="primary" @click="act(row, 'check-in', '核销')">核销</el-button>
          <el-button v-if="row.status === 'checked'" link type="success" @click="act(row, 'complete', '完成')">完成</el-button>
          <el-button v-if="row.status === 'pending'" link type="warning" @click="act(row, 'cancel', '取消')">取消</el-button>
          <el-button v-if="row.status === 'paid'" link type="danger" @click="act(row, 'refund', '退款')">退款</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />
  </el-card>
</template>
```

- [ ] **Step 6: 日历页**

Create `admin/src/views/rental/BookingCalendar.vue`：

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { rentalApi } from '../../api/rental';

const studios = ref<any[]>([]);
const studioId = ref<number | null>(null);
const month = ref(new Date().toISOString().slice(0, 7));
const days = ref<any[]>([]);

onMounted(async () => {
  const res: any = await rentalApi.studioPage(1, 100);
  studios.value = res.list;
  if (studios.value.length) {
    studioId.value = studios.value[0].id;
    await loadCalendar();
  }
});

async function loadCalendar() {
  if (!studioId.value) return;
  days.value = (await rentalApi.calendar(studioId.value, month.value)) as any[];
}
</script>

<template>
  <el-card>
    <h3>档期日历</h3>
    <div style="display: flex; gap: 12px; margin-bottom: 12px">
      <el-select v-model="studioId" placeholder="选择场地" @change="loadCalendar">
        <el-option v-for="s in studios" :key="s.id" :label="s.name" :value="s.id" />
      </el-select>
      <el-date-picker v-model="month" type="month" value-format="YYYY-MM" @change="loadCalendar" />
    </div>
    <el-table :data="days" border max-height="560">
      <el-table-column prop="date" label="日期" width="120" />
      <el-table-column label="占用时段数" width="110">
        <template #default="{ row }">
          <el-tag :type="row.occupiedTimeSlotIds.length ? 'danger' : 'success'">{{ row.occupiedTimeSlotIds.length }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="订单">
        <template #default="{ row }">
          <div v-for="b in row.bookings" :key="b.id" style="line-height: 1.8">
            {{ b.bookingNo }} · {{ b.customerName }} · {{ b.status }}
          </div>
          <span v-if="!row.bookings.length">空闲</span>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>
```

- [ ] **Step 7: 注册路由**

Modify `admin/src/router/index.ts`，在 Layout children 追加：

```typescript
{ path: 'rental/studios', name: 'StudioList', component: () => import('../views/rental/StudioList.vue') },
{ path: 'rental/studio/:id', name: 'StudioForm', component: () => import('../views/rental/StudioForm.vue') },
{ path: 'rental/studio/:id/slots', name: 'TimeSlotManage', component: () => import('../views/rental/TimeSlotManage.vue') },
{ path: 'rental/bookings', name: 'BookingList', component: () => import('../views/rental/BookingList.vue') },
{ path: 'rental/calendar', name: 'BookingCalendar', component: () => import('../views/rental/BookingCalendar.vue') },
```

- [ ] **Step 8: 验证构建**

Run: `npm run build`
Expected: build 成功。

- [ ] **Step 9: 提交**

```bash
git add work/dreamer-v2/admin/src
git commit -m "feat: admin rental pages (studios, time slots, bookings, calendar)"
```

---

### Task 8: 种子数据（租赁菜单 + 示例场地）与服务器验收

**Files:**
- Modify: `work/dreamer-v2/backend/src/seed.ts`
- Create: `work/dreamer-v2/backend/scripts/seed-rental.ts`（独立幂等脚本，或并入 seed.ts）

**Interfaces:**
- Consumes: Task 2/3/4 实体
- Produces: 种子数据——租赁菜单（目录「租赁管理」+ 菜单项 场地管理/订单管理/档期日历 + 按钮权限码 `rental:studio:*`、`rental:booking:*`）绑给 superadmin 角色；示例场地 2 个（含 8 个默认时段）

- [ ] **Step 1: 扩展 seed.ts 菜单定义**

Modify `seed.ts` 的 `menuDefs`，追加：

```typescript
{ key: 'rental-studio', title: '场地管理', path: '/rental/studios', type: 'menu', permissionCode: 'rental:studio:list', sort: 1, parent: 'rental' },
{ key: 'rental-studio-create', title: '新增场地', type: 'button', permissionCode: 'rental:studio:create', sort: 1, parent: 'rental' },
{ key: 'rental-studio-update', title: '编辑场地', type: 'button', permissionCode: 'rental:studio:update', sort: 2, parent: 'rental' },
{ key: 'rental-studio-delete', title: '删除场地', type: 'button', permissionCode: 'rental:studio:delete', sort: 3, parent: 'rental' },
{ key: 'rental-booking', title: '订单管理', path: '/rental/bookings', type: 'menu', permissionCode: 'rental:booking:list', sort: 2, parent: 'rental' },
{ key: 'rental-booking-check', title: '核销/支付', type: 'button', permissionCode: 'rental:booking:check', sort: 1, parent: 'rental' },
{ key: 'rental-booking-cancel', title: '取消订单', type: 'button', permissionCode: 'rental:booking:cancel', sort: 2, parent: 'rental' },
{ key: 'rental-booking-refund', title: '退款', type: 'button', permissionCode: 'rental:booking:refund', sort: 3, parent: 'rental' },
{ key: 'rental-calendar', title: '档期日历', path: '/rental/calendar', type: 'menu', permissionCode: 'rental:booking:list', sort: 3, parent: 'rental' },
```

- [ ] **Step 2: 创建示例场地与时段脚本**

Create `backend/scripts/seed-rental.ts`：

```typescript
import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import configuration from '../src/config/configuration';
import { Studio } from '../src/modules/rental/entities/studio.entity';
import { TimeSlot } from '../src/modules/rental/entities/time-slot.entity';

async function seedRental(): Promise<void> {
  const db = configuration().database as any;
  const ds = new DataSource({
    type: 'mysql',
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.database,
    entities: [Studio, TimeSlot],
    synchronize: true,
    charset: 'utf8mb4',
  });
  await ds.initialize();
  const studioRepo = ds.getRepository(Studio);
  const slotRepo = ds.getRepository(TimeSlot);

  const studios = await studioRepo.find();
  if (studios.length) {
    console.log('Studios already exist, skip');
    await ds.destroy();
    return;
  }

  const a = await studioRepo.save(studioRepo.create({
    name: '主棚A', address: '影棚路1号', description: '120㎡ 无影墙主棚',
    weekdayPriceCents: 20000, weekendPriceCents: 30000, holidayPriceCents: 36000, depositCents: 10000,
    enabled: true, sort: 1,
  }));
  const b = await studioRepo.save(studioRepo.create({
    name: '古风棚B', address: '影棚路2号', description: '80㎡ 古风实景棚',
    weekdayPriceCents: 15000, weekendPriceCents: 22000, holidayPriceCents: 26000, depositCents: 8000,
    enabled: true, sort: 2,
  }));

  const slots = ['09:00-10:00', '10:00-11:00', '11:00-12:00', '13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00']
    .map((range) => {
      const [startTime, endTime] = range.split('-');
      return { startTime, endTime };
    });
  for (const studio of [a, b]) {
    await slotRepo.save(slots.map((s) => slotRepo.create({ studioId: studio.id, ...s, enabled: true })));
  }
  console.log('Seed rental done: 2 studios, 16 time slots');
  await ds.destroy();
}

seedRental().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

Modify `backend/package.json` scripts：

```json
{ "scripts": { "seed:rental": "ts-node scripts/seed-rental.ts" } }
```

- [ ] **Step 3: 本地验证构建与测试**

Run: `npm run build && npm test`
Expected: 通过。

- [ ] **Step 4: 服务器验收（连接 1.14.226.124）**

```powershell
python work/remote.py run "cd /www/wwwroot/dreamer-v2 && git pull origin feature/dreamer-v2-rewrite"
python work/remote.py run "cd /www/wwwroot/dreamer-v2/work/dreamer-v2/backend && npm install && npm run build && npm run seed:rental"
python work/remote.py run "cd /www/wwwroot/dreamer-v2/work/dreamer-v2/admin && npm install && npm run build"
```

Expected: 种子数据写入；后台构建成功。

- [ ] **Step 5: 接口冒烟验证**

上传并执行（或等价命令）：

```bash
TOKEN=$(curl -s http://127.0.0.1:3100/api/auth/login -X POST -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["accessToken"])')
curl -s -H "Authorization: Bearer $TOKEN" http://127.0.0.1:3100/api/rental/studios
curl -s -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:3100/api/rental/studios/1/time-slots"
curl -s -X POST http://127.0.0.1:3100/api/rental/bookings -H 'Content-Type: application/json' -d '{"studioId":1,"customerName":"测试","customerPhone":"13800000000","bookingDate":"2026-08-20","timeSlotIds":[1]}'
curl -s -H "Authorization: Bearer $TOKEN" -X POST http://127.0.0.1:3100/api/rental/bookings/1/pay
curl -s -H "Authorization: Bearer $TOKEN" -X POST http://127.0.0.1:3100/api/rental/bookings/1/check-in
curl -s -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:3100/api/rental/studios/1/calendar?month=2026-08"
```

Expected: 场地列表返回 2 条；下单返回 `code:0`；再次下单同一时段返回 409；状态流转逐级成功。

- [ ] **Step 6: 提交**

```bash
git add work/dreamer-v2/backend/src/seed.ts work/dreamer-v2/backend/scripts work/dreamer-v2/backend/package.json
git commit -m "feat: rental seed data and acceptance"
```

---

## 计划自检

**Spec 覆盖：** 覆盖设计文档 3.1 场地租赁全部条目（场地管理、时段档期、日历排期、预订下单、订单管理、押金、核销）；器材/服装租赁与会员优惠叠加明确留到后续计划。

**占位符扫描：** 无 TBD/TODO；每个代码步骤含完整代码与运行命令。

**类型一致性：** `toCents/toYuan`、`parseDate/formatDate/isWeekend/isHoliday`、`Booking.status` 取值、权限码 `rental:*` 在前后任务一致；`StudioService` 返回 `weekdayPrice`（元）与实体 `weekdayPriceCents`（分）区分明确。
