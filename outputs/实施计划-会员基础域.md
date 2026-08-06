# 会员基础域 实施计划（档案 / 标签 / 等级体系）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现会员管理基础：会员档案（手机号/昵称/头像/消费统计）、会员标签、后台可灵活配置的等级体系（档位/名称/升级条件），消费完成后自动升级。管理后台提供会员列表/详情、标签管理、等级配置页面。

**Architecture:** 后端新增 `modules/member/` 模块（`Member`、`MemberLevel`、`MemberTag` 三个实体域），复用 `BaseService`、权限守卫、金额工具。消费完成通过 `MemberService.addConsumption(phone, amountCents)` 累计并检查升级（按累计消费金额，未来可扩展次数条件）。H5 用户注册在后续 H5 计划接入，本域以手机号为主键、后台可手动创建。

**Tech Stack:** NestJS 10、TypeORM 0.3.x、MySQL 8、Vue 3.4、Element Plus 2.7。

## Global Constraints

- 复用 `BaseService` / `BaseController`（int 主键、`ParseIntPipe`）、`BusinessException`、统一响应 `{ code, message, data }`
- 金额一律用整数「分」；工具函数 `toCents/toYuan`
- 会员以 `phone`（`^1\d{10}$`）为唯一标识；重复创建抛 `BusinessException('手机号已注册', 40030)`
- 等级升级条件：`minSpendCents`（累计消费金额，必填）与 `minOrders`（累计订单数，默认 0）；升级取「满足条件中等级排序最高」的一档；默认不降级
- 标签：`Member` 与 `MemberTag` 通过 join 表 `member_tag` 关联；`@JoinTable({ name: 'member_tag' })`
- 权限码：`member:list/detail/create/update/tag`、`member:level:list/create/update/delete`、`member:tag:list/create/update/delete`
- 中文文案；接口路由 `@Controller('member/...')`
- 新实体注册到 `TypeOrmModule.forFeature`，`app.module.ts` 加入 `MemberModule`
- 管理后台新页面注册路由；侧边栏菜单来自后端种子数据
- 当前环境未安装 git 时提交步骤可跳过并注明；PowerShell 用 `npm.cmd` / `npx.cmd`

**代码根目录：** `C:\Users\97157\Documents\Codex\2026-08-06\lia\work\dreamer-v2`

---

### Task 1: 会员实体与档案 API

**Files:**
- Create: `work/dreamer-v2/backend/src/modules/member/entities/member.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/dto/save-member.dto.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member.service.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member.service.spec.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member.controller.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member.module.ts`
- Modify: `work/dreamer-v2/backend/src/app.module.ts`

**Interfaces:**
- Consumes: `BaseService`、`toCents/toYuan`
- Produces:
  - `Member` 实体：`id`、`phone`(unique)、`nickname`、`avatar`、`levelId`(nullable int)、`totalSpendCents`、`totalOrders`、`status`(1 正常/0 禁用)、`createdAt`、`updatedAt`；`tags: MemberTag[]`（ManyToMany，join 表 `member_tag`）
  - `MemberService`：`page`/`findOne` 返回元单位 `totalSpend`；`create`（重复手机号抛 40030）；`updateProfile`；`addConsumption(phone, amountCents)`（累计金额+订单数，预留升级钩子）
  - `GET/POST /api/member/members`、`GET/PUT /api/member/members/:id`（权限码 `member:list/create/update`）

- [ ] **Step 1: 编写失败测试（MemberService 消费累计与查重）**

Create `backend/src/modules/member/member.service.spec.ts`:

```typescript
import { MemberService } from './member.service';

describe('MemberService', () => {
  const repo: any = {
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn((d: any) => d),
    save: jest.fn(async (e: any) => e),
  };
  const levelRepo: any = { find: jest.fn() };
  const tagRepo: any = { findBy: jest.fn() };
  const service = new MemberService(repo, levelRepo, tagRepo);

  it('page converts cents to yuan', async () => {
    repo.findAndCount.mockResolvedValue([
      [{ id: 1, phone: '13800000000', nickname: '张三', totalSpendCents: 15000, totalOrders: 3 }],
      1,
    ]);
    const res = await service.page(1, 10);
    expect(res.list[0].totalSpend).toBe(150);
  });

  it('rejects duplicate phone on create', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1 });
    await expect(service.create({ phone: '13800000000', nickname: '张三' } as any)).rejects.toThrow('手机号已注册');
  });

  it('addConsumption accumulates spend and orders', async () => {
    const member = { id: 1, phone: '13800000000', totalSpendCents: 10000, totalOrders: 1, levelId: 1 };
    repo.findOneBy.mockResolvedValue(member);
    levelRepo.find.mockResolvedValue([
      { id: 1, name: '普通会员', minSpendCents: 0, minOrders: 0, sort: 1 },
      { id: 2, name: '黄金会员', minSpendCents: 30000, minOrders: 0, sort: 2 },
    ]);
    const res = await service.addConsumption('13800000000', 5000);
    expect(res.totalSpendCents).toBe(15000);
    expect(res.totalOrders).toBe(2);
    expect(res.levelId).toBe(1); // 未达黄金门槛，保持
  });
});
```

Run: `npx jest src/modules/member/member.service.spec.ts` — Expected: FAIL。

- [ ] **Step 2: 创建 Member 实体与 DTO**

Create `backend/src/modules/member/entities/member.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, Index, JoinTable, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { MemberTag } from './member-tag.entity';

@Entity('member')
export class Member {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 20 })
  phone!: string;

  @Column({ length: 64, nullable: true })
  nickname?: string;

  @Column({ type: 'text', nullable: true })
  avatar?: string;

  @Index()
  @Column({ name: 'level_id', type: 'int', nullable: true })
  levelId?: number;

  @Column({ name: 'total_spend_cents', type: 'int', default: 0 })
  totalSpendCents!: number;

  @Column({ name: 'total_orders', type: 'int', default: 0 })
  totalOrders!: number;

  @Column({ default: 1 })
  status!: number;

  @ManyToMany(() => MemberTag, (tag) => tag.members)
  @JoinTable({ name: 'member_tag' })
  tags!: MemberTag[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
```

Create `backend/src/modules/member/dto/save-member.dto.ts`:

```typescript
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class SaveMemberDto {
  @Matches(/^1\d{10}$/)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  nickname?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsInt()
  levelId?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  tagIds?: number[];
}
```

- [ ] **Step 3: 创建 MemberTag 实体（先建，供关联）**

Create `backend/src/modules/member/entities/member-tag.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Member } from './member.entity';

@Entity('member_tag')
export class MemberTag {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 32 })
  name!: string;

  @Column({ length: 16, nullable: true })
  color?: string;

  @ManyToMany(() => Member, (member) => member.tags)
  members!: Member[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

- [ ] **Step 4: 实现 MemberService**

Create `backend/src/modules/member/member.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseService } from '../../common/base/base.service';
import { PageResult } from '../../common/base/page-result';
import { toYuan } from '../../common/utils/money.utils';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Member } from './entities/member.entity';
import { MemberLevel } from './entities/member-level.entity';
import { MemberTag } from './entities/member-tag.entity';
import { SaveMemberDto } from './dto/save-member.dto';

@Injectable()
export class MemberService extends BaseService<Member> {
  constructor(
    @InjectRepository(Member) repo: Repository<Member>,
    @InjectRepository(MemberLevel) private readonly levelRepo: Repository<MemberLevel>,
    @InjectRepository(MemberTag) private readonly tagRepo: Repository<MemberTag>,
  ) {
    super(repo);
  }

  async page(page = 1, pageSize = 10): Promise<PageResult<any>> {
    const result = await super.page(page, pageSize);
    return { ...result, list: result.list.map((m) => this.toPublic(m)) };
  }

  async findOne(id: number): Promise<any> {
    const member = await this.repo.findOne({ where: { id }, relations: { tags: true } });
    if (!member) throw new BusinessException('会员不存在', 40400);
    return this.toPublic(member);
  }

  async create(dto: SaveMemberDto): Promise<any> {
    const exists = await this.repo.findOneBy({ phone: dto.phone });
    if (exists) throw new BusinessException('手机号已注册', 40030);
    const member = this.repo.create({
      phone: dto.phone,
      nickname: dto.nickname,
      avatar: dto.avatar,
      levelId: dto.levelId,
      tags: dto.tagIds?.length ? await this.tagRepo.findBy({ id: In(dto.tagIds) }) : [],
    });
    return this.toPublic(await this.repo.save(member));
  }

  async update(id: number, dto: SaveMemberDto): Promise<any> {
    const member = await super.findOne(id);
    Object.assign(member, {
      nickname: dto.nickname,
      avatar: dto.avatar,
      levelId: dto.levelId,
    });
    if (dto.tagIds) member.tags = await this.tagRepo.findBy({ id: In(dto.tagIds) });
    return this.toPublic(await this.repo.save(member));
  }

  async addConsumption(phone: string, amountCents: number): Promise<any> {
    const member = await this.repo.findOneBy({ phone });
    if (!member) throw new BusinessException('会员不存在', 40400);
    member.totalSpendCents += amountCents;
    member.totalOrders += 1;
    const levels = await this.levelRepo.find({ where: { enabled: true }, order: { sort: 'ASC' } });
    if (levels.length) {
      const target = [...levels]
        .filter((l) => member.totalSpendCents >= l.minSpendCents && member.totalOrders >= l.minOrders)
        .sort((a, b) => b.sort - a.sort)[0];
      if (target && (!member.levelId || (target.sort > (levels.find((l) => l.id === member.levelId)?.sort ?? 0)))) {
        member.levelId = target.id;
      }
    }
    return this.toPublic(await this.repo.save(member));
  }

  private toPublic(m: Member): any {
    return {
      id: m.id,
      phone: m.phone,
      nickname: m.nickname,
      avatar: m.avatar,
      levelId: m.levelId,
      totalSpend: toYuan(m.totalSpendCents),
      totalOrders: m.totalOrders,
      status: m.status,
      tags: m.tags?.map((t) => ({ id: t.id, name: t.name, color: t.color })) ?? [],
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };
  }
}
```

- [ ] **Step 5: 运行测试验证通过**

Run: `npx jest src/modules/member/member.service.spec.ts` — Expected: PASS。

- [ ] **Step 6: 创建 MemberController 与模块**

Create `backend/src/modules/member/member.controller.ts`:

```typescript
import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { MemberService } from './member.service';
import { SaveMemberDto } from './dto/save-member.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('member/members')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get()
  @Permissions('member:list')
  page(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.memberService.page(Number(page), Number(pageSize));
  }

  @Get(':id')
  @Permissions('member:list')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.memberService.findOne(id);
  }

  @Post()
  @Permissions('member:create')
  create(@Body() dto: SaveMemberDto) {
    return this.memberService.create(dto);
  }

  @Put(':id')
  @Permissions('member:update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: SaveMemberDto) {
    return this.memberService.update(id, dto);
  }
}
```

Create `backend/src/modules/member/member.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from './entities/member.entity';
import { MemberLevel } from './entities/member-level.entity';
import { MemberTag } from './entities/member-tag.entity';
import { MemberService } from './member.service';
import { MemberController } from './member.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Member, MemberLevel, MemberTag])],
  controllers: [MemberController],
  providers: [MemberService],
  exports: [MemberService],
})
export class MemberModule {}
```

Modify `app.module.ts`：`import { MemberModule } from './modules/member/member.module';` 加入 imports。

注意：`MemberLevel` 实体在 Task 2 创建；当前先创建占位文件避免构建失败：

Create `backend/src/modules/member/entities/member-level.entity.ts`（完整实现在 Task 2）：

```typescript
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('member_level')
export class MemberLevel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 32 })
  name!: string;

  @Column({ name: 'min_spend_cents', type: 'int', default: 0 })
  minSpendCents!: number;

  @Column({ name: 'min_orders', type: 'int', default: 0 })
  minOrders!: number;

  @Column({ default: true })
  enabled!: boolean;

  @Column({ default: 0 })
  sort!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

- [ ] **Step 7: 验证构建与测试**

Run: `npm run build && npm test`
Expected: 通过。

- [ ] **Step 8: 提交**

```bash
git add work/dreamer-v2/backend/src/modules/member work/dreamer-v2/backend/src/app.module.ts
git commit -m "feat: member entity and profile api"
```

---

### Task 2: 等级体系配置 API

**Files:**
- Modify: `work/dreamer-v2/backend/src/modules/member/entities/member-level.entity.ts`（如需要补字段）
- Create: `work/dreamer-v2/backend/src/modules/member/dto/save-member-level.dto.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-level.service.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-level.service.spec.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-level.controller.ts`
- Modify: `work/dreamer-v2/backend/src/modules/member/member.module.ts`

**Interfaces:**
- Consumes: `BaseService`
- Produces:
  - `MemberLevelService`（extends BaseService）：`page` 返回元单位 `minSpend`；`create/update` 接收元单位转分
  - `GET/POST /api/member/levels`、`GET/PUT/DELETE /api/member/levels/:id`（权限码 `member:level:*`）

- [ ] **Step 1: 编写失败测试（等级元单位换算）**

Create `backend/src/modules/member/member-level.service.spec.ts`:

```typescript
import { MemberLevelService } from './member-level.service';

describe('MemberLevelService', () => {
  const repo: any = {
    findAndCount: jest.fn().mockResolvedValue([
      [{ id: 1, name: '黄金会员', minSpendCents: 30000, minOrders: 0, sort: 2, enabled: true }],
      1,
    ]),
  };
  const service = new MemberLevelService(repo);

  it('page converts minSpend cents to yuan', async () => {
    const res = await service.page(1, 10);
    expect(res.list[0].minSpend).toBe(300);
  });
});
```

Run: `npx jest src/modules/member/member-level.service.spec.ts` — Expected: FAIL。

- [ ] **Step 2: 创建 DTO 与服务**

Create `backend/src/modules/member/dto/save-member-level.dto.ts`:

```typescript
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SaveMemberLevelDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  name!: string;

  @IsInt()
  minSpendYuan!: number;

  @IsOptional()
  @IsInt()
  minOrders?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  sort?: number;
}
```

Create `backend/src/modules/member/member-level.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../common/base/base.service';
import { PageResult } from '../../common/base/page-result';
import { toCents, toYuan } from '../../common/utils/money.utils';
import { MemberLevel } from './entities/member-level.entity';
import { SaveMemberLevelDto } from './dto/save-member-level.dto';

@Injectable()
export class MemberLevelService extends BaseService<MemberLevel> {
  constructor(@InjectRepository(MemberLevel) repo: Repository<MemberLevel>) {
    super(repo);
  }

  async page(page = 1, pageSize = 10): Promise<PageResult<any>> {
    const result = await super.page(page, pageSize);
    return { ...result, list: result.list.map((l) => this.toPublic(l)) };
  }

  async create(dto: SaveMemberLevelDto): Promise<any> {
    const entity = this.repo.create({ ...dto, minSpendCents: toCents(dto.minSpendYuan) });
    return this.toPublic(await this.repo.save(entity));
  }

  async update(id: number, dto: SaveMemberLevelDto): Promise<any> {
    const entity = await super.findOne(id);
    Object.assign(entity, dto, { minSpendCents: toCents(dto.minSpendYuan) });
    return this.toPublic(await this.repo.save(entity));
  }

  private toPublic(l: MemberLevel): any {
    return {
      id: l.id,
      name: l.name,
      minSpend: toYuan(l.minSpendCents),
      minOrders: l.minOrders,
      enabled: l.enabled,
      sort: l.sort,
      createdAt: l.createdAt,
    };
  }
}
```

- [ ] **Step 3: 运行测试验证通过**

Run: `npx jest src/modules/member/member-level.service.spec.ts` — Expected: PASS。

- [ ] **Step 4: 创建控制器并注册**

Create `backend/src/modules/member/member-level.controller.ts`:

```typescript
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
```

Modify `member.module.ts`：注册 `MemberLevelService`、`MemberLevelController`。

- [ ] **Step 5: 验证构建与测试**

Run: `npm run build && npm test`
Expected: 通过。

- [ ] **Step 6: 提交**

```bash
git add work/dreamer-v2/backend/src/modules/member
git commit -m "feat: member level configuration api"
```

---

### Task 3: 会员标签 API

**Files:**
- Create: `work/dreamer-v2/backend/src/modules/member/dto/save-member-tag.dto.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-tag.service.ts`
- Create: `work/dreamer-v2/backend/src/modules/member/member-tag.controller.ts`
- Modify: `work/dreamer-v2/backend/src/modules/member/member.module.ts`

**Interfaces:**
- Consumes: `BaseService`、`MemberTag` 实体（Task 1 已建）
- Produces:
  - `GET/POST /api/member/tags`、`GET/PUT/DELETE /api/member/tags/:id`（权限码 `member:tag:*`）

- [ ] **Step 1: 创建 DTO、服务、控制器**

Create `backend/src/modules/member/dto/save-member-tag.dto.ts`:

```typescript
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SaveMemberTagDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  color?: string;
}
```

Create `backend/src/modules/member/member-tag.service.ts`:

```typescript
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
```

Create `backend/src/modules/member/member-tag.controller.ts`:

```typescript
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
```

Modify `member.module.ts`：注册 `MemberTagService`、`MemberTagController`。

- [ ] **Step 2: 验证构建与测试**

Run: `npm run build && npm test`
Expected: 通过。

- [ ] **Step 3: 提交**

```bash
git add work/dreamer-v2/backend/src/modules/member
git commit -m "feat: member tag api"
```

---

### Task 4: 管理后台会员页面

**Files:**
- Create: `work/dreamer-v2/admin/src/api/member.ts`
- Create: `work/dreamer-v2/admin/src/views/member/MemberList.vue`
- Create: `work/dreamer-v2/admin/src/views/member/MemberDetail.vue`
- Create: `work/dreamer-v2/admin/src/views/member/LevelManage.vue`
- Create: `work/dreamer-v2/admin/src/views/member/TagManage.vue`
- Modify: `work/dreamer-v2/admin/src/router/index.ts`

**Interfaces:**
- Consumes: 后端 `member/members`、`member/levels`、`member/tags` 接口
- Produces:
  - `memberApi`：`memberPage/createMember/updateMember/levelPage/createLevel/updateLevel/deleteLevel/tagPage/createTag/updateTag/deleteTag`
  - 四个页面：会员列表（表格+新建）、会员详情（资料+标签多选）、等级配置（表格+编辑对话框）、标签管理（表格+编辑）

- [ ] **Step 1: 创建 api/member.ts**

Create `admin/src/api/member.ts`:

```typescript
import request from './request';

export const memberApi = {
  memberPage: (page: number, pageSize: number) => request.get<any, any>('/member/members', { params: { page, pageSize } }),
  createMember: (data: any) => request.post<any, any>('/member/members', data),
  updateMember: (id: number, data: any) => request.put<any, any>(`/member/members/${id}`, data),

  levelPage: (page: number, pageSize: number) => request.get<any, any>('/member/levels', { params: { page, pageSize } }),
  createLevel: (data: any) => request.post<any, any>('/member/levels', data),
  updateLevel: (id: number, data: any) => request.put<any, any>(`/member/levels/${id}`, data),
  deleteLevel: (id: number) => request.delete<any, any>(`/member/levels/${id}`),

  tagPage: (page: number, pageSize: number) => request.get<any, any>('/member/tags', { params: { page, pageSize } }),
  createTag: (data: any) => request.post<any, any>('/member/tags', data),
  updateTag: (id: number, data: any) => request.put<any, any>(`/member/tags/${id}`, data),
  deleteTag: (id: number) => request.delete<any, any>(`/member/tags/${id}`),
};
```

- [ ] **Step 2: 会员列表页**

Create `admin/src/views/member/MemberList.vue`：

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { memberApi } from '../../api/member';

const router = useRouter();
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);

async function load() {
  const res: any = await memberApi.memberPage(page.value, pageSize.value);
  list.value = res.list;
  total.value = res.total;
}

onMounted(load);
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>会员管理</h3>
      <el-button type="primary" @click="router.push('/member/new')">新增会员</el-button>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="phone" label="手机号" width="130" />
      <el-table-column prop="nickname" label="昵称" />
      <el-table-column label="累计消费" width="110">
        <template #default="{ row }">¥{{ row.totalSpend }}</template>
      </el-table-column>
      <el-table-column prop="totalOrders" label="订单数" width="80" />
      <el-table-column label="标签" min-width="140">
        <template #default="{ row }">
          <el-tag v-for="t in row.tags" :key="t.id" size="small" style="margin-right: 4px">{{ t.name }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button link type="primary" @click="router.push(`/member/${row.id}`)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />
  </el-card>
</template>
```

- [ ] **Step 3: 会员详情页（含新建）**

Create `admin/src/views/member/MemberDetail.vue`：

```vue
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { memberApi } from '../../api/member';

const route = useRoute();
const router = useRouter();
const id = route.params.id as string | undefined;
const levels = ref<any[]>([]);
const tags = ref<any[]>([]);
const form = reactive({ phone: '', nickname: '', avatar: '', levelId: undefined as number | undefined, tagIds: [] as number[] });

onMounted(async () => {
  const lres: any = await memberApi.levelPage(1, 100);
  levels.value = lres.list;
  const tres: any = await memberApi.tagPage(1, 100);
  tags.value = tres.list;
  if (id && id !== 'new') {
    const res: any = await memberApi.memberPage(1, 1000);
    const m = res.list.find((x: any) => x.id === Number(id));
    if (m) Object.assign(form, {
      phone: m.phone, nickname: m.nickname, avatar: m.avatar, levelId: m.levelId,
      tagIds: m.tags.map((t: any) => t.id),
    });
  }
});

async function submit() {
  if (id && id !== 'new') {
    await memberApi.updateMember(Number(id), form);
  } else {
    await memberApi.createMember(form);
  }
  ElMessage.success('保存成功');
  router.push('/member/members');
}
</script>

<template>
  <el-card>
    <h3>{{ id && id !== 'new' ? '会员详情' : '新增会员' }}</h3>
    <el-form :model="form" label-width="100px" style="max-width: 480px">
      <el-form-item label="手机号"><el-input v-model="form.phone" /></el-form-item>
      <el-form-item label="昵称"><el-input v-model="form.nickname" /></el-form-item>
      <el-form-item label="头像URL"><el-input v-model="form.avatar" /></el-form-item>
      <el-form-item label="等级">
        <el-select v-model="form.levelId" clearable placeholder="选择等级">
          <el-option v-for="l in levels" :key="l.id" :label="l.name" :value="l.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="标签">
        <el-select v-model="form.tagIds" multiple placeholder="选择标签">
          <el-option v-for="t in tags" :key="t.id" :label="t.name" :value="t.id" />
        </el-select>
      </el-form-item>
      <el-button type="primary" @click="submit">保存</el-button>
    </el-form>
  </el-card>
</template>
```

- [ ] **Step 4: 等级配置页**

Create `admin/src/views/member/LevelManage.vue`：

```vue
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { memberApi } from '../../api/member';

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const dialogVisible = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({ name: '', minSpendYuan: 0, minOrders: 0, enabled: true, sort: 0 });

async function load() {
  const res: any = await memberApi.levelPage(page.value, pageSize.value);
  list.value = res.list;
  total.value = res.total;
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, { name: '', minSpendYuan: 0, minOrders: 0, enabled: true, sort: 0 });
  dialogVisible.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  Object.assign(form, { name: row.name, minSpendYuan: row.minSpend, minOrders: row.minOrders, enabled: row.enabled, sort: row.sort });
  dialogVisible.value = true;
}

async function submit() {
  if (editingId.value) {
    await memberApi.updateLevel(editingId.value, form);
  } else {
    await memberApi.createLevel(form);
  }
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  load();
}

async function remove(row: any) {
  await ElMessageBox.confirm(`确定删除等级「${row.name}」？`, '提示');
  await memberApi.deleteLevel(row.id);
  ElMessage.success('已删除');
  load();
}

onMounted(load);
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>会员等级配置</h3>
      <el-button type="primary" @click="openCreate">新增等级</el-button>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="名称" />
      <el-table-column label="升级门槛(累计消费)" width="180">
        <template #default="{ row }">¥{{ row.minSpend }}</template>
      </el-table-column>
      <el-table-column prop="minOrders" label="最低订单数" width="110" />
      <el-table-column prop="sort" label="排序" width="70" />
      <el-table-column label="启用" width="80">
        <template #default="{ row }">{{ row.enabled ? '是' : '否' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑等级' : '新增等级'" width="480">
      <el-form :model="form" label-width="140px">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="累计消费门槛(元)"><el-input-number v-model="form.minSpendYuan" :min="0" /></el-form-item>
        <el-form-item label="最低订单数"><el-input-number v-model="form.minOrders" :min="0" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="form.enabled" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>
```

- [ ] **Step 5: 标签管理页**

Create `admin/src/views/member/TagManage.vue`：

```vue
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { memberApi } from '../../api/member';

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const dialogVisible = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({ name: '', color: '' });

async function load() {
  const res: any = await memberApi.tagPage(page.value, pageSize.value);
  list.value = res.list;
  total.value = res.total;
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, { name: '', color: '' });
  dialogVisible.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  Object.assign(form, { name: row.name, color: row.color });
  dialogVisible.value = true;
}

async function submit() {
  if (editingId.value) {
    await memberApi.updateTag(editingId.value, form);
  } else {
    await memberApi.createTag(form);
  }
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  load();
}

async function remove(row: any) {
  await ElMessageBox.confirm(`确定删除标签「${row.name}」？`, '提示');
  await memberApi.deleteTag(row.id);
  ElMessage.success('已删除');
  load();
}

onMounted(load);
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>会员标签</h3>
      <el-button type="primary" @click="openCreate">新增标签</el-button>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="名称" />
      <el-table-column label="颜色" width="120">
        <template #default="{ row }">
          <span :style="{ color: row.color || '#409EFF' }">● {{ row.color || '默认' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑标签' : '新增标签'" width="420">
      <el-form :model="form" label-width="70px">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="颜色"><el-input v-model="form.color" placeholder="如 #FF6B6B" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>
```

- [ ] **Step 6: 注册路由**

Modify `admin/src/router/index.ts`，在 Layout children 追加：

```typescript
{ path: 'member/members', name: 'MemberList', component: () => import('../views/member/MemberList.vue') },
{ path: 'member/:id', name: 'MemberDetail', component: () => import('../views/member/MemberDetail.vue') },
{ path: 'member/levels', name: 'LevelManage', component: () => import('../views/member/LevelManage.vue') },
{ path: 'member/tags', name: 'TagManage', component: () => import('../views/member/TagManage.vue') },
```

- [ ] **Step 7: 验证构建**

Run: `npm run build`
Expected: build 成功。

- [ ] **Step 8: 提交**

```bash
git add work/dreamer-v2/admin/src
git commit -m "feat: admin member pages (list/detail/levels/tags)"
```

---

### Task 5: 种子数据与服务器验收

**Files:**
- Modify: `work/dreamer-v2/backend/src/seed.ts`
- Modify: `work/dreamer-v2/backend/src/seed-rental.ts`（或新增 `seed-member.ts`）

**Interfaces:**
- Consumes: Task 1-4 产物
- Produces: 会员菜单（会员管理/等级配置/标签管理 + 权限码）绑给 superadmin；默认等级（普通/黄金/钻石）；示例会员 2 个；服务器部署与接口冒烟

- [ ] **Step 1: 扩展 seed.ts 菜单**

Modify `seed.ts` 的 `menuDefs`，追加：

```typescript
{ key: 'member-members', title: '会员管理', path: '/member/members', type: 'menu', permissionCode: 'member:list', sort: 1, parent: 'member' },
{ key: 'member-create', title: '新增会员', type: 'button', permissionCode: 'member:create', sort: 1, parent: 'member' },
{ key: 'member-update', title: '编辑会员', type: 'button', permissionCode: 'member:update', sort: 2, parent: 'member' },
{ key: 'member-levels', title: '等级配置', path: '/member/levels', type: 'menu', permissionCode: 'member:level:list', sort: 2, parent: 'member' },
{ key: 'member-level-create', title: '新增等级', type: 'button', permissionCode: 'member:level:create', sort: 1, parent: 'member' },
{ key: 'member-level-update', title: '编辑等级', type: 'button', permissionCode: 'member:level:update', sort: 2, parent: 'member' },
{ key: 'member-level-delete', title: '删除等级', type: 'button', permissionCode: 'member:level:delete', sort: 3, parent: 'member' },
{ key: 'member-tags', title: '标签管理', path: '/member/tags', type: 'menu', permissionCode: 'member:tag:list', sort: 3, parent: 'member' },
{ key: 'member-tag-create', title: '新增标签', type: 'button', permissionCode: 'member:tag:create', sort: 1, parent: 'member' },
{ key: 'member-tag-update', title: '编辑标签', type: 'button', permissionCode: 'member:tag:update', sort: 2, parent: 'member' },
{ key: 'member-tag-delete', title: '删除标签', type: 'button', permissionCode: 'member:tag:delete', sort: 3, parent: 'member' },
```

- [ ] **Step 2: 创建会员种子脚本**

Create `backend/src/seed-member.ts`：

```typescript
import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import configuration from './config/configuration';
import { Member } from './modules/member/entities/member.entity';
import { MemberLevel } from './modules/member/entities/member-level.entity';
import { MemberTag } from './modules/member/entities/member-tag.entity';

async function seedMember(): Promise<void> {
  const db = configuration().database as any;
  const ds = new DataSource({
    type: 'mysql',
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.database,
    entities: [Member, MemberLevel, MemberTag],
    synchronize: true,
    charset: 'utf8mb4',
  });
  await ds.initialize();

  const levelRepo = ds.getRepository(MemberLevel);
  const levels = await levelRepo.find();
  if (!levels.length) {
    await levelRepo.save([
      levelRepo.create({ name: '普通会员', minSpendCents: 0, minOrders: 0, sort: 1 }),
      levelRepo.create({ name: '黄金会员', minSpendCents: 30000, minOrders: 0, sort: 2 }),
      levelRepo.create({ name: '钻石会员', minSpendCents: 100000, minOrders: 0, sort: 3 }),
    ]);
    console.log('Seed levels done: 3 levels');
  } else {
    console.log('Levels already exist, skip');
  }

  const tagRepo = ds.getRepository(MemberTag);
  const tags = await tagRepo.find();
  if (!tags.length) {
    const vip = await tagRepo.save(tagRepo.create({ name: 'VIP', color: '#E6A23C' }));
    const newbie = await tagRepo.save(tagRepo.create({ name: '新客', color: '#67C23A' }));

    const memberRepo = ds.getRepository(Member);
    if (!(await memberRepo.count())) {
      await memberRepo.save([
        memberRepo.create({ phone: '13800000001', nickname: '示例会员A', totalSpendCents: 50000, totalOrders: 8, levelId: 2, tags: [vip] }),
        memberRepo.create({ phone: '13800000002', nickname: '示例会员B', totalSpendCents: 500, totalOrders: 1, tags: [newbie] }),
      ]);
      console.log('Seed members done: 2 members');
    }
  } else {
    console.log('Tags already exist, skip');
  }
  await ds.destroy();
}

seedMember().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

Modify `backend/package.json` scripts：

```json
{ "scripts": { "seed:member": "ts-node src/seed-member.ts" } }
```

- [ ] **Step 3: 本地验证构建与测试**

Run: `npm run build && npm test`
Expected: 通过。

- [ ] **Step 4: 提交推送**

```bash
git add work/dreamer-v2/backend/src/seed.ts work/dreamer-v2/backend/src/seed-member.ts work/dreamer-v2/backend/package.json
git commit -m "feat: member seed data (menus, levels, tags, sample members)"
git push origin feature/dreamer-v2-rewrite
```

- [ ] **Step 5: 服务器部署**

```powershell
python work/remote.py run "cd /www/wwwroot/dreamer-v2 && git pull origin feature/dreamer-v2-rewrite && cd work/dreamer-v2/backend && npm install && npm run build && npm run seed && npm run seed:member && pm2 restart dreamer-v2-api && cd ../admin && npm install && npm run build"
```

Expected: 种子写入；后端在线；后台构建成功。

- [ ] **Step 6: 接口冒烟**

```bash
TOKEN=$(curl -s http://127.0.0.1:3100/api/auth/login -X POST -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["accessToken"])')
curl -s -H "Authorization: Bearer $TOKEN" http://127.0.0.1:3100/api/member/members
curl -s -H "Authorization: Bearer $TOKEN" http://127.0.0.1:3100/api/member/levels
curl -s -H "Authorization: Bearer $TOKEN" http://127.0.0.1:3100/api/member/tags
```

Expected: 会员 2 条、等级 3 档、标签 2 个。

- [ ] **Step 7: 外网页面验证（Playwright）**

登录 http://1.14.226.124:3101/，验证侧边栏出现「会员管理」「等级配置」「标签管理」，打开会员列表显示 2 名示例会员，无控制台报错。

---

## 计划自检

**Spec 覆盖：** 覆盖设计文档 3.2 会员区的前三项（会员档案、会员标签、等级体系）；积分/储值/次卡/优惠券属「会员资产域」、签到/生日/返利/活动属「会员运营域」，分别独立计划。

**占位符扫描：** 无 TBD/TODO；每个代码步骤含完整代码与运行命令。

**类型一致性：** `phone` 唯一标识、`minSpendCents`（分）与 `minSpend`（元）、`levelId` 在实体/服务/前端一致；权限码 `member:*` 在控制器与种子菜单一致。
