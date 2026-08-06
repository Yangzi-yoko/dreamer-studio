# 器材/服装租赁域 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在已完成平台底座与场地租赁域的基础上，实现器材/服装租赁业务：商品管理（按天/按时段计费、库存、押金）、租赁下单（库存校验、金额计算）、订单状态机（待支付→已支付→已领取→已归还→已完成/已取消/已退款）、归还登记（损坏赔偿扣款 + 押金退还）、续租，以及管理后台页面。

**Architecture:** 后端在现有 `modules/rental/` 下新增 `RentalItem` 与 `ItemRental` 两个实体域，复用 `BaseService`、`RedisService`、日期/金额工具、权限守卫。库存防超租采用事务内行锁（`SELECT ... FOR UPDATE`）＋ Redis 锁双重保障。管理后台复用「租赁管理」菜单，新增商品管理、器材订单两个页面。

**Tech Stack:** NestJS 10、TypeORM 0.3.x、MySQL 8、redis 4.x、Vue 3.4、Element Plus 2.7。

## Global Constraints

- 复用 `BaseService` / `BaseController`（int 主键、`ParseIntPipe`）、`BusinessException`、统一响应 `{ code, message, data }`
- 金额一律用整数「分」存储；工具函数 `toCents/toYuan` 负责转换
- 计费方式 `billingType: 'day' | 'slot'`：按天 = 单价 × 天数；按时段 = 单价 × 时段数；金额 = 单价 × 数量 × 计费单位
- 库存防超租：同一商品「已租未还」数量 + 本次下单数量 ≤ 库存；订单取消/退款/归还完成后释放库存
- 订单状态机：`pending → paid → picked → returned → completed`；`pending → cancelled`；`paid → refunded`
- 归还登记：无损坏 → 押金全额退还（`depositRefunded=true`）；有损坏 → 记录 `damageDeductCents`（从押金中扣除），押金仍标记已退还
- 续租：仅 `paid`/`picked` 状态可续租，按相同计费规则追加金额
- 权限码：`rental:item:list/create/update/delete`、`rental:item-rental:list/check/return/extend/cancel/refund`
- 中文文案；日期 `YYYY-MM-DD`
- 新实体注册到 `TypeOrmModule.forFeature`，接口路由统一 `@Controller('rental/items')` / `@Controller('rental/item-rentals')`
- 管理后台新页面注册路由，侧边栏菜单来自后端种子数据
- 当前环境未安装 git 时提交步骤可跳过并注明；PowerShell 用 `npm.cmd` / `npx.cmd`

**代码根目录：** `C:\Users\97157\Documents\Codex\2026-08-06\lia\work\dreamer-v2`

---

### Task 1: 器材商品实体与管理 API

**Files:**
- Create: `work/dreamer-v2/backend/src/modules/rental/entities/rental-item.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/rental/dto/save-rental-item.dto.ts`
- Create: `work/dreamer-v2/backend/src/modules/rental/rental-item.service.ts`
- Create: `work/dreamer-v2/backend/src/modules/rental/rental-item.service.spec.ts`
- Create: `work/dreamer-v2/backend/src/modules/rental/rental-item.controller.ts`
- Modify: `work/dreamer-v2/backend/src/modules/rental/rental.module.ts`

**Interfaces:**
- Consumes: `BaseService`、`toCents/toYuan`、权限守卫
- Produces:
  - `RentalItem` 实体：`id`、`name`、`images`(text)、`description`、`billingType`(`day|slot`)、`unitPriceCents`、`depositCents`、`stock`(int)、`enabled`(boolean)、`sort`、`createdAt`、`updatedAt`
  - `RentalItemService`：`page`/`findOne` 返回元单位字段 `unitPrice/deposit`；`create/update` 接收元单位 DTO 转分存储
  - 接口：`GET/POST /api/rental/items`、`GET/PUT/DELETE /api/rental/items/:id`（权限码 `rental:item:*`）

- [ ] **Step 1: 编写失败测试（RentalItemService 单位换算）**

Create `backend/src/modules/rental/rental-item.service.spec.ts`:

```typescript
import { RentalItemService } from './rental-item.service';

describe('RentalItemService', () => {
  const repo: any = {
    findAndCount: jest.fn().mockResolvedValue([
      [{ id: 1, name: '汉服A', billingType: 'day', unitPriceCents: 5000, depositCents: 20000, stock: 5, enabled: true }],
      1,
    ]),
  };
  const service = new RentalItemService(repo);

  it('page converts cents to yuan', async () => {
    const res = await service.page(1, 10);
    expect(res.list[0].unitPrice).toBe(50);
    expect(res.list[0].deposit).toBe(200);
  });
});
```

Run: `npx jest src/modules/rental/rental-item.service.spec.ts` — Expected: FAIL。

- [ ] **Step 2: 创建 RentalItem 实体**

Create `backend/src/modules/rental/entities/rental-item.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('rental_item')
export class RentalItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 128 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  images?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'billing_type', length: 8, default: 'day' })
  billingType!: 'day' | 'slot';

  @Column({ name: 'unit_price_cents', type: 'int', default: 0 })
  unitPriceCents!: number;

  @Column({ name: 'deposit_cents', type: 'int', default: 0 })
  depositCents!: number;

  @Column({ type: 'int', default: 0 })
  stock!: number;

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

Create `backend/src/modules/rental/dto/save-rental-item.dto.ts`:

```typescript
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SaveRentalItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name!: string;

  @IsOptional()
  @IsString()
  images?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['day', 'slot'])
  billingType!: 'day' | 'slot';

  @IsInt()
  unitPriceYuan!: number;

  @IsInt()
  depositYuan!: number;

  @IsInt()
  stock!: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  sort?: number;
}
```

- [ ] **Step 4: 实现 RentalItemService**

Create `backend/src/modules/rental/rental-item.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../common/base/base.service';
import { PageResult } from '../../common/base/page-result';
import { toCents, toYuan } from '../../common/utils/money.utils';
import { RentalItem } from './entities/rental-item.entity';
import { SaveRentalItemDto } from './dto/save-rental-item.dto';

@Injectable()
export class RentalItemService extends BaseService<RentalItem> {
  constructor(@InjectRepository(RentalItem) repo: Repository<RentalItem>) {
    super(repo);
  }

  async page(page = 1, pageSize = 10): Promise<PageResult<any>> {
    const result = await super.page(page, pageSize);
    return { ...result, list: result.list.map((i) => this.toPublic(i)) };
  }

  async findOne(id: number): Promise<any> {
    return this.toPublic(await super.findOne(id));
  }

  async create(dto: SaveRentalItemDto): Promise<any> {
    const entity = this.repo.create({
      ...dto,
      unitPriceCents: toCents(dto.unitPriceYuan),
      depositCents: toCents(dto.depositYuan),
    });
    return this.toPublic(await this.repo.save(entity));
  }

  async update(id: number, dto: SaveRentalItemDto): Promise<any> {
    const entity = await super.findOne(id);
    Object.assign(entity, dto, {
      unitPriceCents: toCents(dto.unitPriceYuan),
      depositCents: toCents(dto.depositYuan),
    });
    return this.toPublic(await this.repo.save(entity));
  }

  private toPublic(i: RentalItem): any {
    return {
      id: i.id,
      name: i.name,
      images: i.images,
      description: i.description,
      billingType: i.billingType,
      unitPrice: toYuan(i.unitPriceCents),
      deposit: toYuan(i.depositCents),
      stock: i.stock,
      enabled: i.enabled,
      sort: i.sort,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    };
  }
}
```

- [ ] **Step 5: 运行测试验证通过**

Run: `npx jest src/modules/rental/rental-item.service.spec.ts` — Expected: PASS。

- [ ] **Step 6: 创建 RentalItemController**

Create `backend/src/modules/rental/rental-item.controller.ts`:

```typescript
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { RentalItemService } from './rental-item.service';
import { SaveRentalItemDto } from './dto/save-rental-item.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('rental/items')
export class RentalItemController {
  constructor(private readonly itemService: RentalItemService) {}

  @Get()
  @Permissions('rental:item:list')
  page(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.itemService.page(Number(page), Number(pageSize));
  }

  @Get(':id')
  @Permissions('rental:item:list')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.itemService.findOne(id);
  }

  @Post()
  @Permissions('rental:item:create')
  create(@Body() dto: SaveRentalItemDto) {
    return this.itemService.create(dto);
  }

  @Put(':id')
  @Permissions('rental:item:update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: SaveRentalItemDto) {
    return this.itemService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('rental:item:delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.itemService.remove(id);
    return { id };
  }
}
```

- [ ] **Step 7: 注册到 RentalModule**

Modify `rental.module.ts`：

```typescript
import { RentalItem } from './entities/rental-item.entity';
import { RentalItemService } from './rental-item.service';
import { RentalItemController } from './rental-item.controller';
// imports: TypeOrmModule.forFeature([..., RentalItem])
// controllers: [..., RentalItemController]
// providers: [..., RentalItemService]
```

- [ ] **Step 8: 验证构建与全量测试**

Run: `npm run build && npm test`
Expected: 通过。

- [ ] **Step 9: 提交**

```bash
git add work/dreamer-v2/backend/src/modules/rental
git commit -m "feat: rental item entity and management api"
```

---

### Task 2: 器材租赁订单（下单 + 库存防超租）

**Files:**
- Create: `work/dreamer-v2/backend/src/modules/rental/entities/item-rental.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/rental/dto/create-item-rental.dto.ts`
- Create: `work/dreamer-v2/backend/src/modules/rental/item-rental.service.ts`
- Create: `work/dreamer-v2/backend/src/modules/rental/item-rental.service.spec.ts`
- Create: `work/dreamer-v2/backend/src/modules/rental/item-rental.controller.ts`
- Modify: `work/dreamer-v2/backend/src/modules/rental/rental.module.ts`

**Interfaces:**
- Consumes: `RentalItem`、`RedisService`、`date.utils`、`money.utils`
- Produces:
  - `ItemRental` 实体：`id`、`rentalNo`(unique)、`itemId`、`customerName`、`customerPhone`、`billingType`、`quantity`、`startDate`(`YYYY-MM-DD`)、`endDate`(`YYYY-MM-DD`)、`slotCount`(按时段模式的时段数)、`unitPriceCents`、`totalAmountCents`、`depositCents`、`depositRefunded`、`damageDeductCents`、`status`、`remark`、`createdAt`、`updatedAt`
  - `ItemRentalService.create(dto)`：校验商品存在与启用 → 按 billingType 校验日期/天数/时段数 → Redis 锁 → 事务内 `SELECT ... FOR UPDATE` 锁定商品行 → 统计「已租未还」数量（状态 pending/paid/picked）→ 超租抛 `BusinessException('库存不足', 40920)` → 计算金额 → 创建订单
  - `POST /api/rental/item-rentals`（公开下单）；`GET /api/rental/item-rentals`（后台列表，权限码 `rental:item-rental:list`）

- [ ] **Step 1: 编写失败测试（金额与库存校验）**

Create `backend/src/modules/rental/item-rental.service.spec.ts`:

```typescript
import { ItemRentalService } from './item-rental.service';

describe('ItemRentalService', () => {
  const itemRepo: any = { findOne: jest.fn() };
  const rentalRepo: any = {
    create: jest.fn((_e: any, d: any) => d),
    save: jest.fn(async (e: any) => ({ ...e, id: 1 })),
    findAndCount: jest.fn(),
    sum: jest.fn(),
  };
  const dataSource: any = {
    transaction: jest.fn(async (fn: any) =>
      fn({
        findOne: jest.fn(),
        sum: jest.fn().mockResolvedValue(0),
        create: jest.fn((_e: any, d: any) => d),
        save: jest.fn(async (e: any) => e),
      }),
    ),
  };
  const redis: any = { get: jest.fn().mockResolvedValue(null), set: jest.fn(), del: jest.fn() };
  const service = new ItemRentalService(itemRepo, rentalRepo, dataSource, redis);

  it('calculates day-mode total = unitPrice * quantity * days', async () => {
    itemRepo.findOne.mockResolvedValue({
      id: 1,
      name: '汉服A',
      billingType: 'day',
      unitPriceCents: 5000,
      depositCents: 20000,
      stock: 5,
      enabled: true,
    });
    const dto = {
      itemId: 1,
      customerName: '张三',
      customerPhone: '13800000000',
      billingType: 'day',
      quantity: 2,
      startDate: '2026-08-10',
      endDate: '2026-08-12',
      slotCount: 0,
    };
    const res = await service.create(dto as any);
    expect(res.totalAmountCents).toBe(30000); // 50 * 2 * 3天
    expect(res.depositCents).toBe(20000);
  });

  it('rejects when stock insufficient', async () => {
    itemRepo.findOne.mockResolvedValue({
      id: 1,
      name: '汉服A',
      billingType: 'day',
      unitPriceCents: 5000,
      depositCents: 20000,
      stock: 2,
      enabled: true,
    });
    const dto = {
      itemId: 1,
      customerName: '张三',
      customerPhone: '13800000000',
      billingType: 'day',
      quantity: 3,
      startDate: '2026-08-10',
      endDate: '2026-08-11',
      slotCount: 0,
    };
    await expect(service.create(dto as any)).rejects.toThrow('库存不足');
  });
});
```

Run: `npx jest src/modules/rental/item-rental.service.spec.ts` — Expected: FAIL。

- [ ] **Step 2: 创建 ItemRental 实体**

Create `backend/src/modules/rental/entities/item-rental.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('item_rental')
export class ItemRental {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'rental_no', unique: true, length: 32 })
  rentalNo!: string;

  @Index()
  @Column({ name: 'item_id', type: 'int' })
  itemId!: number;

  @Column({ name: 'customer_name', length: 64 })
  customerName!: string;

  @Column({ name: 'customer_phone', length: 20 })
  customerPhone!: string;

  @Column({ name: 'billing_type', length: 8, default: 'day' })
  billingType!: 'day' | 'slot';

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Index()
  @Column({ name: 'start_date', length: 10 })
  startDate!: string;

  @Column({ name: 'end_date', length: 10 })
  endDate!: string;

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

  @Column({ name: 'damage_deduct_cents', type: 'int', default: 0 })
  damageDeductCents!: number;

  @Column({ length: 16, default: 'pending' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
```

- [ ] **Step 3: 创建 DTO**

Create `backend/src/modules/rental/dto/create-item-rental.dto.ts`:

```typescript
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CreateItemRentalDto {
  @IsInt()
  itemId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  customerName!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^1\d{10}$/)
  customerPhone!: string;

  @IsIn(['day', 'slot'])
  billingType!: 'day' | 'slot';

  @IsInt()
  @Min(1)
  quantity!: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate!: string;

  @IsInt()
  @Min(0)
  slotCount!: number;

  @IsOptional()
  @IsString()
  remark?: string;
}
```

- [ ] **Step 4: 实现 ItemRentalService**

Create `backend/src/modules/rental/item-rental.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RedisService } from '../../common/redis/redis.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { formatDate, parseDate } from '../../common/utils/date.utils';
import { RentalItem } from './entities/rental-item.entity';
import { ItemRental } from './entities/item-rental.entity';
import { CreateItemRentalDto } from './dto/create-item-rental.dto';

@Injectable()
export class ItemRentalService {
  constructor(
    @InjectRepository(RentalItem) private readonly itemRepo: Repository<RentalItem>,
    @InjectRepository(ItemRental) private readonly rentalRepo: Repository<ItemRental>,
    private readonly dataSource: DataSource,
    private readonly redis: RedisService,
  ) {}

  async create(dto: CreateItemRentalDto): Promise<ItemRental> {
    const item = await this.itemRepo.findOne({ where: { id: dto.itemId, enabled: true } });
    if (!item) throw new BusinessException('商品不存在或已下架', 40400);
    if (dto.billingType !== item.billingType) {
      throw new BusinessException('计费方式与商品设置不符', 40022);
    }

    const start = parseDate(dto.startDate);
    const end = parseDate(dto.endDate);
    if (end < start) throw new BusinessException('结束日期不能早于开始日期', 40023);
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    const units = dto.billingType === 'day' ? days : dto.slotCount;
    if (units <= 0) throw new BusinessException('租期不合法', 40024);

    const lockKey = `rental:item-lock:${dto.itemId}`;
    const locked = await this.redis.get(lockKey);
    if (locked) throw new BusinessException('该商品正在被其他人下单，请重试', 40921);
    await this.redis.set(lockKey, '1', 15);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const lockedItem = await manager.findOne(RentalItem, { where: { id: dto.itemId }, lock: { mode: 'pessimistic_write' } });
        if (!lockedItem || !lockedItem.enabled) throw new BusinessException('商品不存在或已下架', 40400);

        const rented = (await manager.sum(ItemRental, 'quantity', {
          itemId: dto.itemId,
          status: 'pending',
        })) || 0;
        const picked = (await manager.sum(ItemRental, 'quantity', {
          itemId: dto.itemId,
          status: 'paid',
        })) || 0;
        const active = (await manager.sum(ItemRental, 'quantity', {
          itemId: dto.itemId,
          status: 'picked',
        })) || 0;
        const occupied = rented + picked + active;
        if (occupied + dto.quantity > lockedItem.stock) {
          throw new BusinessException('库存不足', 40920);
        }

        const unitPriceCents = lockedItem.unitPriceCents;
        const rentalNo = `R${formatDate(new Date()).replace(/-/g, '')}${Date.now().toString(36).toUpperCase()}`;
        const rental = manager.create(ItemRental, {
          rentalNo,
          itemId: lockedItem.id,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          billingType: dto.billingType,
          quantity: dto.quantity,
          startDate: dto.startDate,
          endDate: dto.endDate,
          slotCount: dto.slotCount,
          unitPriceCents,
          totalAmountCents: unitPriceCents * dto.quantity * units,
          depositCents: lockedItem.depositCents,
          status: 'pending',
          remark: dto.remark,
        });
        return manager.save(rental);
      });
    } finally {
      await this.redis.del(lockKey);
    }
  }

  async page(page = 1, pageSize = 10, status?: string): Promise<{ list: ItemRental[]; total: number; page: number; pageSize: number }> {
    const where = status ? { status } : {};
    const [list, total] = await this.rentalRepo.findAndCount({
      where,
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' },
    });
    return { list, total, page, pageSize };
  }
}
```

- [ ] **Step 5: 运行测试验证通过**

Run: `npx jest src/modules/rental/item-rental.service.spec.ts` — Expected: PASS。

- [ ] **Step 6: 创建 ItemRentalController**

Create `backend/src/modules/rental/item-rental.controller.ts`:

```typescript
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { ItemRentalService } from './item-rental.service';
import { CreateItemRentalDto } from './dto/create-item-rental.dto';

@Controller('rental/item-rentals')
export class ItemRentalController {
  constructor(private readonly itemRentalService: ItemRentalService) {}

  @Post()
  create(@Body() dto: CreateItemRentalDto) {
    return this.itemRentalService.create(dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  @Permissions('rental:item-rental:list')
  page(@Query('page') page = 1, @Query('pageSize') pageSize = 10, @Query('status') status?: string) {
    return this.itemRentalService.page(Number(page), Number(pageSize), status);
  }
}
```

Modify `rental.module.ts`：注册 `RentalItem`、`ItemRental` 实体，`ItemRentalService`、`ItemRentalController`。

- [ ] **Step 7: 验证构建与测试**

Run: `npm run build && npm test`
Expected: 通过。

- [ ] **Step 8: 提交**

```bash
git add work/dreamer-v2/backend/src/modules/rental
git commit -m "feat: item rental order with stock conflict lock"
```

---

### Task 3: 器材订单状态流转（支付/领取/归还/续租）

**Files:**
- Create: `work/dreamer-v2/backend/src/modules/rental/item-rental-lifecycle.service.ts`
- Create: `work/dreamer-v2/backend/src/modules/rental/item-rental-lifecycle.service.spec.ts`
- Modify: `work/dreamer-v2/backend/src/modules/rental/item-rental.controller.ts`
- Modify: `work/dreamer-v2/backend/src/modules/rental/item-rental.service.ts`
- Modify: `work/dreamer-v2/backend/src/modules/rental/rental.module.ts`

**Interfaces:**
- Consumes: `ItemRental`、`RentalItem` 实体
- Produces:
  - `ItemRentalLifecycleService`：`pay`(pending→paid)、`pick`(paid→picked)、`returnRental(id, dto)`(picked→returned，记录损坏扣款)、`complete`(returned→completed，`depositRefunded=true`)、`cancel`(pending→cancelled)、`refund`(paid→refunded)、`extend(id, dto)`(paid/picked→按相同计费规则追加金额与日期)
  - 接口：`POST /api/rental/item-rentals/:id/pay|pick|return|complete|cancel|refund|extend`（权限码 `rental:item-rental:*`）

- [ ] **Step 1: 编写失败测试（状态机 + 归还扣款 + 续租）**

Create `backend/src/modules/rental/item-rental-lifecycle.service.spec.ts`:

```typescript
import { ItemRentalLifecycleService } from './item-rental-lifecycle.service';
import { BusinessException } from '../../common/exceptions/business.exception';

describe('ItemRentalLifecycleService', () => {
  const repo: any = { findOneBy: jest.fn(), save: jest.fn(async (e: any) => e) };
  const itemRepo: any = { findOneBy: jest.fn() };
  const service = new ItemRentalLifecycleService(repo, itemRepo);

  it('pay transitions pending to paid', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, status: 'pending' });
    const res = await service.pay(1);
    expect(res.status).toBe('paid');
  });

  it('return records damage deduction and marks returned', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, status: 'picked', damageDeductCents: 0 });
    const res = await service.returnRental(1, { damageDeductYuan: 50 });
    expect(res.status).toBe('returned');
    expect(res.damageDeductCents).toBe(5000);
  });

  it('extend adds amount for paid order', async () => {
    repo.findOneBy.mockResolvedValue({
      id: 1,
      status: 'paid',
      billingType: 'day',
      quantity: 1,
      unitPriceCents: 5000,
      totalAmountCents: 15000,
      endDate: '2026-08-12',
      slotCount: 0,
    });
    const res = await service.extend(1, { extendDays: 2, extendSlotCount: 0 });
    expect(res.totalAmountCents).toBe(25000);
    expect(res.endDate).toBe('2026-08-14');
  });

  it('rejects extending a cancelled order', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, status: 'cancelled' });
    await expect(service.extend(1, { extendDays: 1, extendSlotCount: 0 })).rejects.toThrow(BusinessException);
  });
});
```

Run: `npx jest src/modules/rental/item-rental-lifecycle.service.spec.ts` — Expected: FAIL。

- [ ] **Step 2: 实现状态机服务**

Create `backend/src/modules/rental/item-rental-lifecycle.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { toCents } from '../../common/utils/money.utils';
import { formatDate, parseDate } from '../../common/utils/date.utils';
import { ItemRental } from './entities/item-rental.entity';
import { RentalItem } from './entities/rental-item.entity';

const TRANSITIONS: Record<string, string[]> = {
  pay: ['pending'],
  pick: ['paid'],
  return: ['picked'],
  complete: ['returned'],
  cancel: ['pending'],
  refund: ['paid'],
  extend: ['paid', 'picked'],
};

@Injectable()
export class ItemRentalLifecycleService {
  constructor(
    @InjectRepository(ItemRental) private readonly repo: Repository<ItemRental>,
    @InjectRepository(RentalItem) private readonly itemRepo: Repository<RentalItem>,
  ) {}

  private async transition(id: number, action: string, toStatus: string, mutate?: (r: ItemRental) => void): Promise<ItemRental> {
    const rental = await this.repo.findOneBy({ id });
    if (!rental) throw new BusinessException('订单不存在', 40400);
    if (!TRANSITIONS[action].includes(rental.status)) {
      throw new BusinessException('当前状态不允许该操作', 40910);
    }
    if (mutate) mutate(rental);
    rental.status = toStatus;
    if (toStatus === 'completed') rental.depositRefunded = true;
    return this.repo.save(rental);
  }

  pay(id: number): Promise<ItemRental> {
    return this.transition(id, 'pay', 'paid');
  }

  pick(id: number): Promise<ItemRental> {
    return this.transition(id, 'pick', 'picked');
  }

  returnRental(id: number, dto: { damageDeductYuan?: number }): Promise<ItemRental> {
    return this.transition(id, 'return', 'returned', (r) => {
      r.damageDeductCents = dto.damageDeductYuan ? toCents(dto.damageDeductYuan) : 0;
    });
  }

  complete(id: number): Promise<ItemRental> {
    return this.transition(id, 'complete', 'completed');
  }

  cancel(id: number): Promise<ItemRental> {
    return this.transition(id, 'cancel', 'cancelled');
  }

  refund(id: number): Promise<ItemRental> {
    return this.transition(id, 'refund', 'refunded');
  }

  async extend(id: number, dto: { extendDays: number; extendSlotCount: number }): Promise<ItemRental> {
    const rental = await this.repo.findOneBy({ id });
    if (!rental) throw new BusinessException('订单不存在', 40400);
    if (!TRANSITIONS.extend.includes(rental.status)) {
      throw new BusinessException('当前状态不允许该操作', 40910);
    }
    const item = await this.itemRepo.findOneBy({ id: rental.itemId });
    if (!item) throw new BusinessException('商品不存在', 40400);

    if (rental.billingType === 'day') {
      if (dto.extendDays <= 0) throw new BusinessException('续租天数不合法', 40025);
      const end = parseDate(rental.endDate);
      end.setDate(end.getDate() + dto.extendDays);
      rental.endDate = formatDate(end);
      rental.totalAmountCents += item.unitPriceCents * rental.quantity * dto.extendDays;
    } else {
      if (dto.extendSlotCount <= 0) throw new BusinessException('续租时段数不合法', 40026);
      rental.slotCount += dto.extendSlotCount;
      rental.totalAmountCents += item.unitPriceCents * rental.quantity * dto.extendSlotCount;
    }
    return this.repo.save(rental);
  }
}
```

- [ ] **Step 3: 运行测试验证通过**

Run: `npx jest src/modules/rental/item-rental-lifecycle.service.spec.ts` — Expected: PASS。

- [ ] **Step 4: 控制器加状态接口**

Modify `item-rental.controller.ts`，注入 lifecycle 并添加：

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Post(':id/pay')
@Permissions('rental:item-rental:check')
pay(@Param('id', ParseIntPipe) id: number) {
  return this.lifecycle.pay(id);
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Post(':id/pick')
@Permissions('rental:item-rental:check')
pick(@Param('id', ParseIntPipe) id: number) {
  return this.lifecycle.pick(id);
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Post(':id/return')
@Permissions('rental:item-rental:return')
returnRental(@Param('id', ParseIntPipe) id: number, @Body() dto: { damageDeductYuan?: number }) {
  return this.lifecycle.returnRental(id, dto);
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Post(':id/complete')
@Permissions('rental:item-rental:check')
complete(@Param('id', ParseIntPipe) id: number) {
  return this.lifecycle.complete(id);
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Post(':id/cancel')
@Permissions('rental:item-rental:cancel')
cancel(@Param('id', ParseIntPipe) id: number) {
  return this.lifecycle.cancel(id);
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Post(':id/refund')
@Permissions('rental:item-rental:refund')
refund(@Param('id', ParseIntPipe) id: number) {
  return this.lifecycle.refund(id);
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Post(':id/extend')
@Permissions('rental:item-rental:extend')
extend(@Param('id', ParseIntPipe) id: number, @Body() dto: { extendDays: number; extendSlotCount: number }) {
  return this.lifecycle.extend(id, dto);
}
```

Modify `rental.module.ts`：注册 `ItemRentalLifecycleService`。

- [ ] **Step 5: 验证构建与测试**

Run: `npm run build && npm test`
Expected: 通过。

- [ ] **Step 6: 提交**

```bash
git add work/dreamer-v2/backend/src/modules/rental
git commit -m "feat: item rental state machine (pay/pick/return/complete/cancel/refund/extend)"
```

---

### Task 4: 管理后台器材页面

**Files:**
- Create: `work/dreamer-v2/admin/src/views/rental/ItemList.vue`
- Create: `work/dreamer-v2/admin/src/views/rental/ItemForm.vue`
- Create: `work/dreamer-v2/admin/src/views/rental/ItemRentalList.vue`
- Modify: `work/dreamer-v2/admin/src/api/rental.ts`
- Modify: `work/dreamer-v2/admin/src/router/index.ts`

**Interfaces:**
- Consumes: 后端 `rental/items`、`rental/item-rentals` 接口
- Produces:
  - `rentalApi` 追加：`itemPage/createItem/updateItem/deleteItem/itemRentalPage/itemRentalAction`
  - 三个页面：商品列表（表格 + 上下架 + 删除）、商品编辑（计费方式/单价/押金/库存）、器材订单列表（状态筛选 + 支付/领取/归还（损坏扣款输入）/完成/取消/退款/续租）

- [ ] **Step 1: 追加 api**

Modify `admin/src/api/rental.ts`，追加：

```typescript
itemPage: (page: number, pageSize: number) => request.get<any, any>('/rental/items', { params: { page, pageSize } }),
createItem: (data: any) => request.post<any, any>('/rental/items', data),
updateItem: (id: number, data: any) => request.put<any, any>(`/rental/items/${id}`, data),
deleteItem: (id: number) => request.delete<any, any>(`/rental/items/${id}`),
itemRentalPage: (params: any) => request.get<any, any>('/rental/item-rentals', { params }),
itemRentalAction: (id: number, action: string, data?: any) => request.post<any, any>(`/rental/item-rentals/${id}/${action}`, data || {}),
```

- [ ] **Step 2: 商品列表页**

Create `admin/src/views/rental/ItemList.vue`：

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
  const res: any = await rentalApi.itemPage(page.value, pageSize.value);
  list.value = res.list;
  total.value = res.total;
}

async function toggleEnabled(row: any) {
  await rentalApi.updateItem(row.id, { ...row, enabled: !row.enabled });
  ElMessage.success('已更新');
  load();
}

async function remove(row: any) {
  await ElMessageBox.confirm(`确定删除商品「${row.name}」？`, '提示');
  await rentalApi.deleteItem(row.id);
  ElMessage.success('已删除');
  load();
}

onMounted(load);
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>器材/服装管理</h3>
      <el-button type="primary" @click="router.push('/rental/item/new')">新增商品</el-button>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="名称" />
      <el-table-column label="计费方式" width="100">
        <template #default="{ row }">{{ row.billingType === 'day' ? '按天' : '按时段' }}</template>
      </el-table-column>
      <el-table-column label="单价" width="90">
        <template #default="{ row }">¥{{ row.unitPrice }}</template>
      </el-table-column>
      <el-table-column label="押金" width="90">
        <template #default="{ row }">¥{{ row.deposit }}</template>
      </el-table-column>
      <el-table-column prop="stock" label="库存" width="80" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">{{ row.enabled ? '上架' : '下架' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button link type="primary" @click="router.push(`/rental/item/${row.id}`)">编辑</el-button>
          <el-button link type="warning" @click="toggleEnabled(row)">{{ row.enabled ? '下架' : '上架' }}</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />
  </el-card>
</template>
```

- [ ] **Step 3: 商品编辑页**

Create `admin/src/views/rental/ItemForm.vue`：

```vue
<script setup lang="ts">
import { onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { rentalApi } from '../../api/rental';

const route = useRoute();
const router = useRouter();
const id = route.params.id as string | undefined;
const form = reactive({
  name: '', images: '', description: '', billingType: 'day',
  unitPriceYuan: 0, depositYuan: 0, stock: 0, enabled: true, sort: 0,
});

onMounted(async () => {
  if (id && id !== 'new') {
    const res: any = await rentalApi.itemPage(1, 100);
    const data = res.list.find((i: any) => i.id === Number(id));
    if (data) Object.assign(form, {
      name: data.name, images: data.images, description: data.description, billingType: data.billingType,
      unitPriceYuan: data.unitPrice, depositYuan: data.deposit, stock: data.stock,
      enabled: data.enabled, sort: data.sort,
    });
  }
});

async function submit() {
  if (id && id !== 'new') {
    await rentalApi.updateItem(Number(id), form);
  } else {
    await rentalApi.createItem(form);
  }
  ElMessage.success('保存成功');
  router.push('/rental/items');
}
</script>

<template>
  <el-card>
    <h3>{{ id && id !== 'new' ? '编辑商品' : '新增商品' }}</h3>
    <el-form :model="form" label-width="120px" style="max-width: 560px">
      <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
      <el-form-item label="图片URL"><el-input v-model="form.images" placeholder="逗号分隔多个URL" /></el-form-item>
      <el-form-item label="说明"><el-input v-model="form.description" type="textarea" /></el-form-item>
      <el-form-item label="计费方式">
        <el-radio-group v-model="form.billingType">
          <el-radio value="day">按天</el-radio>
          <el-radio value="slot">按时段</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="单价(元)"><el-input-number v-model="form.unitPriceYuan" :min="0" /></el-form-item>
      <el-form-item label="押金(元)"><el-input-number v-model="form.depositYuan" :min="0" /></el-form-item>
      <el-form-item label="库存"><el-input-number v-model="form.stock" :min="0" /></el-form-item>
      <el-form-item label="排序"><el-input-number v-model="form.sort" /></el-form-item>
      <el-form-item label="上架"><el-switch v-model="form.enabled" /></el-form-item>
      <el-button type="primary" @click="submit">保存</el-button>
    </el-form>
  </el-card>
</template>
```

- [ ] **Step 4: 器材订单列表页**

Create `admin/src/views/rental/ItemRentalList.vue`：

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { rentalApi } from '../../api/rental';

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const status = ref('');
const statusMap: Record<string, string> = {
  pending: '待支付', paid: '已支付', picked: '已领取', returned: '已归还', completed: '已完成', cancelled: '已取消', refunded: '已退款',
};

async function load() {
  const res: any = await rentalApi.itemRentalPage({ page: page.value, pageSize: pageSize.value, status: status.value || undefined });
  list.value = res.list;
  total.value = res.total;
}

async function act(row: any, action: string, label: string, data?: any) {
  await rentalApi.itemRentalAction(row.id, action, data);
  ElMessage.success(`${label}成功`);
  load();
}

async function doReturn(row: any) {
  const { value } = await ElMessageBox.prompt('如有损坏请输入赔偿金额（元），无损坏填 0', '归还登记', {
    inputValue: '0',
    inputPattern: /^\d+(\.\d{1,2})?$/,
    inputErrorMessage: '请输入正确金额',
  });
  await act(row, 'return', '归还', { damageDeductYuan: Number(value) });
}

async function doExtend(row: any) {
  const { value } = await ElMessageBox.prompt(row.billingType === 'day' ? '请输入续租天数' : '请输入续租时段数', '续租', {
    inputPattern: /^[1-9]\d*$/,
    inputErrorMessage: '请输入正整数',
  });
  const data = row.billingType === 'day'
    ? { extendDays: Number(value), extendSlotCount: 0 }
    : { extendDays: 0, extendSlotCount: Number(value) };
  await act(row, 'extend', '续租', data);
}

load();
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>器材/服装订单</h3>
      <el-select v-model="status" placeholder="全部状态" clearable style="width: 140px" @change="load">
        <el-option v-for="(label, key) in statusMap" :key="key" :label="label" :value="key" />
      </el-select>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="rentalNo" label="订单号" width="200" />
      <el-table-column prop="customerName" label="客户" width="90" />
      <el-table-column prop="customerPhone" label="手机号" width="130" />
      <el-table-column label="数量" width="70">
        <template #default="{ row }">{{ row.quantity }}</template>
      </el-table-column>
      <el-table-column prop="startDate" label="起租" width="110" />
      <el-table-column prop="endDate" label="应还" width="110" />
      <el-table-column label="金额" width="100">
        <template #default="{ row }">¥{{ (row.totalAmountCents / 100).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="押金" width="90">
        <template #default="{ row }">¥{{ (row.depositCents / 100).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">{{ statusMap[row.status] || row.status }}</template>
      </el-table-column>
      <el-table-column label="操作" width="300">
        <template #default="{ row }">
          <el-button v-if="row.status === 'pending'" link type="primary" @click="act(row, 'pay', '支付')">支付</el-button>
          <el-button v-if="row.status === 'paid'" link type="primary" @click="act(row, 'pick', '领取')">领取</el-button>
          <el-button v-if="row.status === 'picked'" link type="success" @click="doReturn(row)">归还</el-button>
          <el-button v-if="row.status === 'returned'" link type="success" @click="act(row, 'complete', '完成')">完成</el-button>
          <el-button v-if="row.status === 'paid' || row.status === 'picked'" link type="primary" @click="doExtend(row)">续租</el-button>
          <el-button v-if="row.status === 'pending'" link type="warning" @click="act(row, 'cancel', '取消')">取消</el-button>
          <el-button v-if="row.status === 'paid'" link type="danger" @click="act(row, 'refund', '退款')">退款</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />
  </el-card>
</template>
```

- [ ] **Step 5: 注册路由**

Modify `admin/src/router/index.ts`，在 Layout children 追加：

```typescript
{ path: 'rental/items', name: 'ItemList', component: () => import('../views/rental/ItemList.vue') },
{ path: 'rental/item/:id', name: 'ItemForm', component: () => import('../views/rental/ItemForm.vue') },
{ path: 'rental/item-rentals', name: 'ItemRentalList', component: () => import('../views/rental/ItemRentalList.vue') },
```

- [ ] **Step 6: 验证构建**

Run: `npm run build`
Expected: build 成功。

- [ ] **Step 7: 提交**

```bash
git add work/dreamer-v2/admin/src
git commit -m "feat: admin item and item-rental pages"
```

---

### Task 5: 种子数据与服务器验收

**Files:**
- Modify: `work/dreamer-v2/backend/src/seed.ts`
- Modify: `work/dreamer-v2/backend/src/seed-rental.ts`

**Interfaces:**
- Consumes: 全部 Task 1-4 产物
- Produces: 器材菜单（商品管理/器材订单 + 权限码）绑给 superadmin；示例商品（汉服、相机、灯光各 1 件）；服务器部署与接口冒烟

- [ ] **Step 1: 扩展 seed.ts 菜单**

Modify `seed.ts` 的 `menuDefs`，追加：

```typescript
{ key: 'rental-item', title: '器材/服装管理', path: '/rental/items', type: 'menu', permissionCode: 'rental:item:list', sort: 4, parent: 'rental' },
{ key: 'rental-item-create', title: '新增商品', type: 'button', permissionCode: 'rental:item:create', sort: 1, parent: 'rental' },
{ key: 'rental-item-update', title: '编辑商品', type: 'button', permissionCode: 'rental:item:update', sort: 2, parent: 'rental' },
{ key: 'rental-item-delete', title: '删除商品', type: 'button', permissionCode: 'rental:item:delete', sort: 3, parent: 'rental' },
{ key: 'rental-item-rental', title: '器材/服装订单', path: '/rental/item-rentals', type: 'menu', permissionCode: 'rental:item-rental:list', sort: 5, parent: 'rental' },
{ key: 'rental-item-rental-check', title: '支付/领取/完成', type: 'button', permissionCode: 'rental:item-rental:check', sort: 1, parent: 'rental' },
{ key: 'rental-item-rental-return', title: '归还登记', type: 'button', permissionCode: 'rental:item-rental:return', sort: 2, parent: 'rental' },
{ key: 'rental-item-rental-extend', title: '续租', type: 'button', permissionCode: 'rental:item-rental:extend', sort: 3, parent: 'rental' },
{ key: 'rental-item-rental-cancel', title: '取消订单', type: 'button', permissionCode: 'rental:item-rental:cancel', sort: 4, parent: 'rental' },
{ key: 'rental-item-rental-refund', title: '退款', type: 'button', permissionCode: 'rental:item-rental:refund', sort: 5, parent: 'rental' },
```

- [ ] **Step 2: 扩展示例商品**

Modify `seed-rental.ts`，在现有场地数据后追加：

```typescript
import { RentalItem } from './modules/rental/entities/rental-item.entity';
// entities: [Studio, TimeSlot, RentalItem]
const itemRepo = ds.getRepository(RentalItem);
const existingItems = await itemRepo.find();
if (!existingItems.length) {
  await itemRepo.save([
    itemRepo.create({ name: '汉服·凤冠霞帔', billingType: 'day', unitPriceCents: 5000, depositCents: 20000, stock: 10, enabled: true, sort: 1 }),
    itemRepo.create({ name: '单反相机', billingType: 'day', unitPriceCents: 8000, depositCents: 50000, stock: 5, enabled: true, sort: 2 }),
    itemRepo.create({ name: 'LED 灯光套装', billingType: 'slot', unitPriceCents: 3000, depositCents: 30000, stock: 8, enabled: true, sort: 3 }),
  ]);
  console.log('Seed items done: 3 items');
}
```

- [ ] **Step 3: 本地验证构建与测试**

Run: `npm run build && npm test`
Expected: 通过。

- [ ] **Step 4: 提交推送**

```bash
git add work/dreamer-v2/backend/src/seed.ts work/dreamer-v2/backend/src/seed-rental.ts
git commit -m "feat: item rental seed data (menus, sample items)"
git push origin feature/dreamer-v2-rewrite
```

- [ ] **Step 5: 服务器部署**

```powershell
python work/remote.py run "cd /www/wwwroot/dreamer-v2 && git pull origin feature/dreamer-v2-rewrite && cd work/dreamer-v2/backend && npm install && npm run build && npm run seed && npm run seed:rental && pm2 restart dreamer-v2-api && cd ../admin && npm install && npm run build"
```

Expected: 种子写入；后端在线；后台构建成功。

- [ ] **Step 6: 接口冒烟**

上传并执行（或等价命令）：

```bash
TOKEN=$(curl -s http://127.0.0.1:3100/api/auth/login -X POST -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["accessToken"])')
curl -s -H "Authorization: Bearer $TOKEN" http://127.0.0.1:3100/api/rental/items
curl -s -X POST http://127.0.0.1:3100/api/rental/item-rentals -H 'Content-Type: application/json' -d '{"itemId":1,"customerName":"测试","customerPhone":"13800000000","billingType":"day","quantity":1,"startDate":"2026-08-10","endDate":"2026-08-12","slotCount":0}'
curl -s -H "Authorization: Bearer $TOKEN" -X POST http://127.0.0.1:3100/api/rental/item-rentals/1/pay
curl -s -H "Authorization: Bearer $TOKEN" -X POST http://127.0.0.1:3100/api/rental/item-rentals/1/pick
curl -s -H "Authorization: Bearer $TOKEN" -X POST http://127.0.0.1:3100/api/rental/item-rentals/1/return -H 'Content-Type: application/json' -d '{"damageDeductYuan":0}'
curl -s -H "Authorization: Bearer $TOKEN" -X POST http://127.0.0.1:3100/api/rental/item-rentals/1/complete
```

Expected: 商品列表 3 条；按天下单 2 天 1 件 = 100 元；状态逐级流转成功；超库存下单返回 40920。

- [ ] **Step 7: 外网页面验证（Playwright）**

登录 http://1.14.226.124:3101/，验证侧边栏出现「器材/服装管理」「器材/服装订单」，打开商品列表页显示 3 件示例商品，无控制台报错。

---

## 计划自检

**Spec 覆盖：** 覆盖设计文档 3.1 器材/服装租赁全部条目（商品管理、租期选择、库存校验、归还登记、续租）；4.2 数据流（浏览→租期→库存→下单→支付→领取→归还→押金退还）已实现。

**占位符扫描：** 无 TBD/TODO；每个代码步骤含完整代码与运行命令。

**类型一致性：** `billingType` 取值 `day|slot` 在实体/DTO/服务/前端一致；状态值 `pending/paid/picked/returned/completed/cancelled/refunded` 在前后端一致；金额字段 `*Cents`（分）与 `unitPrice/deposit`（元）区分明确。
