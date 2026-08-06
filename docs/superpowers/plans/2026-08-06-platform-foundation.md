# 平台底座 + RBAC 后台骨架 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在全新目录中搭建「造梦者」新系统后端与管理后台骨架：NestJS 后端（统一响应/异常/日志、Base CRUD、RBAC 权限、超级管理员账户体系）+ Vue3 管理后台（登录、动态菜单、系统管理页），完成时可通过 `admin/admin123` 登录后台并配置角色与菜单权限。

**Architecture:** 后端采用 NestJS 模块化：`common/`（基础能力）+ `modules/system/`（管理员/角色/菜单）+ `modules/auth/`（登录鉴权）。前端采用 Vue3 + Element Plus 单页应用，登录后从后端拉取当前管理员可访问的菜单动态渲染侧边栏。后续业务模块（租赁、会员、H5）在后续计划中接入此骨架。

**Tech Stack:** NestJS 10、TypeORM 0.3.x、MySQL 8、mysql2 3.x、Redis（redis 包 4.x）、JWT + passport、class-validator、Vue 3.4、Vite 5、Element Plus 2.7、Pinia、Vue Router 4、Axios、Vitest。

## Global Constraints

- Node.js 18（服务器为 18.19）；本地开发机已装 Node 24，使用系统 node/npm 即可，部署阶段以 Node 18 为准
- NestJS `^10.0.0`、TypeORM `^0.3.17`、mysql2 `^3.6.0`、redis `^4.6.7`
- Vue `^3.4.21`、Vite `^5.2.10`、Element Plus `^2.7.3`
- 所有后端接口统一返回 `{ code, message, data }`；`code === 0` 表示成功，非 0 表示业务失败
- 后端业务异常必须使用 `BusinessException`，禁止直接抛裸 Error 到接口层
- 数据库连接字符串、Redis、JWT 密钥一律读取 `.env`，不得硬编码
- 权限模型：单商户多账户；只有 `isSuper === true` 的管理员能创建后台账户；普通管理员按角色绑定的菜单权限码访问接口
- 用户界面文案使用中文
- 当前执行环境未安装 git：计划中的提交步骤如因环境无法执行，可跳过并在任务日志中注明
- 本地 `npm install` 可能需要网络授权；失败时以管理员批准的方式重试

**代码根目录：** `C:\Users\97157\Documents\Codex\2026-08-06\lia\work\dreamer-v2`

**后续计划（本计划完成后另行编写）：** 场地租赁域、器材/服装租赁域、会员运营域、H5 用户端、服务器部署上线。

---

### Task 1: 脚手架与依赖安装

**Files:**
- Create: `work/dreamer-v2/backend/`（Nest CLI 生成）
- Modify: `work/dreamer-v2/backend/package.json`（追加依赖）
- Modify: `work/dreamer-v2/backend/src/app.module.ts`（后续任务修改，本任务保持默认）

**Interfaces:**
- Consumes: 无
- Produces: 可通过 `npm run start:dev` 启动的 NestJS 空应用；npm 脚本 `test`、`build`、`start:dev` 可用

- [ ] **Step 1: 生成 NestJS 项目**

```powershell
New-Item -ItemType Directory -Force -Path 'C:\Users\97157\Documents\Codex\2026-08-06\lia\work\dreamer-v2'
Set-Location 'C:\Users\97157\Documents\Codex\2026-08-06\lia\work\dreamer-v2'
npx --yes @nestjs/cli@10 new backend --package-manager npm --skip-git
```

Expected: 生成 `backend/` 目录，内含标准 Nest 结构（src/main.ts、src/app.module.ts 等）。

- [ ] **Step 2: 安装后端运行依赖**

```powershell
Set-Location 'C:\Users\97157\Documents\Codex\2026-08-06\lia\work\dreamer-v2\backend'
npm install @nestjs/config @nestjs/typeorm typeorm@0.3.17 mysql2@3.6.0 @nestjs/jwt @nestjs/passport passport passport-jwt bcryptjs class-validator class-transformer redis@4.6.7 @nestjs/schedule
npm install -D @types/passport-jwt @types/bcryptjs
```

Expected: `package.json` 中出现上述依赖；`npm install` 无报错。

- [ ] **Step 3: 验证脚手架**

```powershell
Set-Location 'C:\Users\97157\Documents\Codex\2026-08-06\lia\work\dreamer-v2\backend'
npm run build
npm test
```

Expected: build 成功；默认 `app.controller.spec.ts` 测试通过。

- [ ] **Step 4: 提交（如环境可用 git）**

```bash
git add -A
git commit -m "chore: scaffold nestjs backend"
```

---

### Task 2: 配置加载、数据库与 Redis 连接

**Files:**
- Create: `work/dreamer-v2/backend/src/config/configuration.ts`
- Create: `work/dreamer-v2/backend/.env.example`
- Create: `work/dreamer-v2/backend/.env`
- Create: `work/dreamer-v2/backend/src/common/redis/redis.service.ts`
- Create: `work/dreamer-v2/backend/src/common/redis/redis.module.ts`
- Create: `work/dreamer-v2/backend/src/common/redis/redis.service.spec.ts`
- Modify: `work/dreamer-v2/backend/src/app.module.ts`

**Interfaces:**
- Consumes: Task 1 脚手架
- Produces:
  - `RedisService`：`get<T>(key: string): Promise<T | null>`、`set(key: string, value: unknown, ttlSeconds?: number): Promise<void>`、`del(key: string): Promise<void>`；连接失败时静默降级（捕获异常不抛出），并导出 `RedisModule`
  - 全局 `ConfigModule`（isGlobal）提供 `process.env` 读取

- [ ] **Step 1: 创建配置文件**

Create `backend/src/config/configuration.ts`:

```typescript
export default () => ({
  database: {
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    username: process.env.DATABASE_USERNAME || 'dreamer_v2',
    password: process.env.DATABASE_PASSWORD || 'dreamer_v2',
    database: process.env.DATABASE_NAME || 'dreamer_v2',
    synchronize: process.env.DATABASE_SYNC === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
});
```

- [ ] **Step 2: 创建 .env 模板与实际 .env**

Create `backend/.env.example` and copy to `backend/.env`:

```env
NODE_ENV=development
PORT=3000
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_USERNAME=dreamer_v2
DATABASE_PASSWORD=dreamer_v2
DATABASE_NAME=dreamer_v2
DATABASE_SYNC=true
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
JWT_SECRET=dev-secret-please-rotate
JWT_EXPIRES_IN=7d
```

- [ ] **Step 3: 创建 Redis 服务与模块**

Create `backend/src/common/redis/redis.service.ts`:

```typescript
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType | null = null;

  constructor(private readonly config: ConfigService) {}

  private async getClient(): Promise<RedisClientType | null> {
    if (this.client?.isOpen) return this.client;
    try {
      const redisConfig = this.config.get('redis');
      this.client = createClient({
        socket: { host: redisConfig.host, port: redisConfig.port },
        password: redisConfig.password || undefined,
      });
      this.client.on('error', (err) => this.logger.warn(`redis: ${err.message}`));
      await this.client.connect();
      return this.client;
    } catch (err) {
      this.logger.warn(`redis unavailable, degrade gracefully: ${(err as Error).message}`);
      return null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const client = await this.getClient();
    if (!client) return null;
    const raw = await client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const client = await this.getClient();
    if (!client) return;
    await client.set(key, JSON.stringify(value), ttlSeconds ? { EX: ttlSeconds } : undefined);
  }

  async del(key: string): Promise<void> {
    const client = await this.getClient();
    if (!client) return;
    await client.del(key);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) await this.client.quit();
  }
}
```

Create `backend/src/common/redis/redis.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
```

- [ ] **Step 4: 编写 Redis 服务单元测试（先跑失败）**

Create `backend/src/common/redis/redis.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: ConfigService, useValue: { get: (k: string) => ({ host: '127.0.0.1', port: 6379, password: '' } as any) } },
      ],
    }).compile();
    service = moduleRef.get(RedisService);
  });

  it('degraded get returns null when redis is down', async () => {
    const value = await service.get('missing');
    expect(value).toBeNull();
  });
});
```

Run: `npx jest src/common/redis/redis.service.spec.ts -t "degraded get"` — Expected: FAIL（`RedisService` 尚不存在或无法解析）。

- [ ] **Step 5: 注册 ConfigModule / TypeORM / RedisModule 到根模块**

Modify `backend/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { RedisModule } from './common/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('database.host'),
        port: config.get('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.database'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: config.get('database.synchronize'),
        charset: 'utf8mb4',
      }),
    }),
    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 6: 运行测试验证通过**

Run: `npx jest src/common/redis/redis.service.spec.ts -t "degraded get"`
Expected: PASS。

- [ ] **Step 7: 验证应用可编译**

Run: `npm run build`
Expected: build 成功。

- [ ] **Step 8: 提交**

```bash
git add -A
git commit -m "feat: config, typeorm and redis wiring"
```

---

### Task 3: 统一响应、异常体系与请求日志

**Files:**
- Create: `work/dreamer-v2/backend/src/common/interceptors/transform.interceptor.ts`
- Create: `work/dreamer-v2/backend/src/common/interceptors/transform.interceptor.spec.ts`
- Create: `work/dreamer-v2/backend/src/common/exceptions/business.exception.ts`
- Create: `work/dreamer-v2/backend/src/common/exceptions/business.exception.spec.ts`
- Create: `work/dreamer-v2/backend/src/common/filters/all-exceptions.filter.ts`
- Create: `work/dreamer-v2/backend/src/common/filters/all-exceptions.filter.spec.ts`
- Create: `work/dreamer-v2/backend/src/common/middleware/logger.middleware.ts`
- Modify: `work/dreamer-v2/backend/src/main.ts`

**Interfaces:**
- Consumes: Task 2 的全局模块
- Produces:
  - `TransformInterceptor`：将所有成功响应包装为 `{ code: 0, message: 'ok', data }`
  - `BusinessException`：`new BusinessException(message, code?)`，默认 code `10000`
  - `AllExceptionsFilter`：统一输出 `{ code, message, timestamp, path }`；HttpException 使用其 status，BusinessException 使用其 code，其余 500
  - `LoggerMiddleware`：记录 `method url status duration(ms)`

- [ ] **Step 1: 编写失败测试（响应拦截器）**

Create `backend/src/common/interceptors/transform.interceptor.spec.ts`:

```typescript
import { TransformInterceptor } from './transform.interceptor';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';

describe('TransformInterceptor', () => {
  it('wraps data into { code: 0, message, data }', (done) => {
    const interceptor = new TransformInterceptor();
    const ctx = { switchToHttp: () => ({ getRequest: () => ({ url: '/x' }) }) } as ExecutionContext;
    const handler: CallHandler = { handle: () => of({ id: 1 }) };
    interceptor.intercept(ctx, handler).subscribe((res) => {
      expect(res).toEqual({ code: 0, message: 'ok', data: { id: 1 } });
      done();
    });
  });
});
```

Run: `npx jest src/common/interceptors/transform.interceptor.spec.ts` — Expected: FAIL。

- [ ] **Step 2: 实现响应拦截器**

Create `backend/src/common/interceptors/transform.interceptor.ts`:

```typescript
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(map((data) => ({ code: 0, message: 'ok', data })));
  }
}
```

- [ ] **Step 3: 运行测试验证通过**

Run: `npx jest src/common/interceptors/transform.interceptor.spec.ts`
Expected: PASS。

- [ ] **Step 4: 编写失败测试（业务异常）**

Create `backend/src/common/exceptions/business.exception.spec.ts`:

```typescript
import { BusinessException } from './business.exception';

describe('BusinessException', () => {
  it('defaults code to 10000', () => {
    const e = new BusinessException('库存不足');
    expect(e.code).toBe(10000);
    expect(e.message).toBe('库存不足');
  });

  it('accepts custom code', () => {
    const e = new BusinessException('已超时', 40001);
    expect(e.code).toBe(40001);
  });
});
```

Run: `npx jest src/common/exceptions/business.exception.spec.ts` — Expected: FAIL。

- [ ] **Step 5: 实现业务异常**

Create `backend/src/common/exceptions/business.exception.ts`:

```typescript
export class BusinessException extends Error {
  constructor(
    message: string,
    public readonly code: number = 10000,
  ) {
    super(message);
    this.name = 'BusinessException';
  }
}
```

- [ ] **Step 6: 运行测试验证通过**

Run: `npx jest src/common/exceptions/business.exception.spec.ts`
Expected: PASS。

- [ ] **Step 7: 编写失败测试（全局异常过滤器）**

Create `backend/src/common/filters/all-exceptions.filter.spec.ts`:

```typescript
import { AllExceptionsFilter } from './all-exceptions.filter';
import { BusinessException } from '../exceptions/business.exception';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

describe('AllExceptionsFilter', () => {
  function buildHost(status: number, body: any): ArgumentsHost {
    return {
      switchToHttp: () => ({
        getResponse: () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() }),
        getRequest: () => ({ url: '/api/test' }),
      }),
      getType: () => 'http',
    } as unknown as ArgumentsHost;
  }

  it('formats BusinessException with its code', () => {
    const filter = new AllExceptionsFilter();
    const host = buildHost(200, {});
    filter.catch(new BusinessException('库存不足', 50001), host);
    const json = host.switchToHttp().getResponse().json as jest.Mock;
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 50001, message: '库存不足' }));
  });

  it('formats HttpException with http status', () => {
    const filter = new AllExceptionsFilter();
    const host = buildHost(200, {});
    filter.catch(new HttpException('未授权', HttpStatus.UNAUTHORIZED), host);
    const json = host.switchToHttp().getResponse().json as jest.Mock;
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 401, message: '未授权' }));
  });
});
```

Run: `npx jest src/common/filters/all-exceptions.filter.spec.ts` — Expected: FAIL。

- [ ] **Step 8: 实现全局异常过滤器**

Create `backend/src/common/filters/all-exceptions.filter.ts`:

```typescript
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { BusinessException } from '../exceptions/business.exception';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const path = request.url;

    let code = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';

    if (exception instanceof BusinessException) {
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      code = exception.getStatus();
      message = exception.message;
    } else {
      this.logger.error((exception as Error).message, (exception as Error).stack);
    }

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    response.status(status).json({ code, message, timestamp: new Date().toISOString(), path });
  }
}
```

- [ ] **Step 9: 运行测试验证通过**

Run: `npx jest src/common/filters/all-exceptions.filter.spec.ts`
Expected: PASS。

- [ ] **Step 10: 实现请求日志中间件**

Create `backend/src/common/middleware/logger.middleware.ts`:

```typescript
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    res.on('finish', () => {
      this.logger.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
  }
}
```

- [ ] **Step 11: 在 main.ts 中启用全局拦截器、过滤器、校验管道与日志**

Modify `backend/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: true, credentials: true });
  app.use((req, res, next) => new LoggerMiddleware().use(req, res, next));
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

注意：`app.setGlobalPrefix('api')` 后，所有接口路径以 `/api` 开头，与服务器 Nginx 现有转发规则保持一致。

- [ ] **Step 12: 验证全部测试与构建**

Run: `npm test && npm run build`
Expected: 全部通过。

- [ ] **Step 13: 提交**

```bash
git add -A
git commit -m "feat: unified response, exceptions and request logging"
```

---

### Task 4: BaseService 与 BaseController 模板

**Files:**
- Create: `work/dreamer-v2/backend/src/common/base/base.service.ts`
- Create: `work/dreamer-v2/backend/src/common/base/base.service.spec.ts`
- Create: `work/dreamer-v2/backend/src/common/base/base.controller.ts`
- Create: `work/dreamer-v2/backend/src/common/base/page-result.ts`

**Interfaces:**
- Consumes: Task 3 的异常体系
- Produces:
  - `PageResult<T>`：`{ list: T[]; total: number; page: number; pageSize: number }`
  - `BaseService<T>`：`page(page, pageSize): Promise<PageResult<T>>`、`findOne(id: string | number): Promise<T>`（不存在抛 `BusinessException('记录不存在', 40400)`）、`create(dto: Partial<T>): Promise<T>`、`update(id, dto: Partial<T>): Promise<T>`、`remove(id): Promise<void>`
  - `BaseController<T>`：抽象类，提供 `GET /`（分页）、`GET /:id`、`POST /`、`PUT /:id`、`DELETE /:id`，子类通过 `@Controller()` 装饰

- [ ] **Step 1: 编写失败测试（BaseService）**

Create `backend/src/common/base/base.service.spec.ts`:

```typescript
import { BaseService } from './base.service';
import { BusinessException } from '../exceptions/business.exception';

class FakeEntity {
  id!: number;
  name!: string;
}

describe('BaseService', () => {
  const repo: any = {
    findAndCount: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn((dto: any) => dto),
    save: jest.fn(async (e: any) => e),
    delete: jest.fn(),
  };
  const service = new BaseService<FakeEntity>(repo);

  it('pages records', async () => {
    repo.findAndCount.mockResolvedValue([[{ id: 1, name: 'a' }], 1]);
    const result = await service.page(1, 10);
    expect(result.total).toBe(1);
    expect(result.list[0].name).toBe('a');
  });

  it('throws 40400 when record missing', async () => {
    repo.findOneBy.mockResolvedValue(null);
    await expect(service.findOne(99)).rejects.toThrowError(BusinessException);
  });
});
```

Run: `npx jest src/common/base/base.service.spec.ts` — Expected: FAIL。

- [ ] **Step 2: 实现 BaseService 与 PageResult**

Create `backend/src/common/base/page-result.ts`:

```typescript
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

Create `backend/src/common/base/base.service.ts`:

```typescript
import { Repository } from 'typeorm';
import { BusinessException } from '../exceptions/business.exception';
import { PageResult } from './page-result';

export class BaseService<T extends { id: any }> {
  constructor(protected readonly repo: Repository<T>) {}

  async page(page = 1, pageSize = 10): Promise<PageResult<T>> {
    const [list, total] = await this.repo.findAndCount({
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' } as any,
    });
    return { list, total, page, pageSize };
  }

  async findOne(id: any): Promise<T> {
    const entity = await this.repo.findOneBy({ id } as any);
    if (!entity) throw new BusinessException('记录不存在', 40400);
    return entity;
  }

  async create(dto: Partial<T>): Promise<T> {
    const entity = this.repo.create(dto as any);
    return this.repo.save(entity);
  }

  async update(id: any, dto: Partial<T>): Promise<T> {
    const entity = await this.findOne(id);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: any): Promise<void> {
    await this.findOne(id);
    await this.repo.delete(id);
  }
}
```

- [ ] **Step 3: 运行测试验证通过**

Run: `npx jest src/common/base/base.service.spec.ts`
Expected: PASS。

- [ ] **Step 4: 实现 BaseController 抽象类**

Create `backend/src/common/base/base.controller.ts`:

```typescript
import { Body, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { BaseService } from './base.service';
import { PageResult } from './page-result';

export abstract class BaseController<T extends { id: any }> {
  protected constructor(protected readonly service: BaseService<T>) {}

  @Get()
  page(@Query('page') page = 1, @Query('pageSize') pageSize = 10): Promise<PageResult<T>> {
    return this.service.page(Number(page), Number(pageSize));
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<T> {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: Partial<T>): Promise<T> {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<T>): Promise<T> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ id: number }> {
    await this.service.remove(id);
    return { id };
  }
}
```

注意：后续业务控制器若主键不是 int，需重写对应方法（本任务仅提供模板，不注册路由）。

- [ ] **Step 5: 验证构建**

Run: `npm run build`
Expected: build 成功。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: base service and base controller"
```

---

### Task 5: RBAC 实体（管理员 / 角色 / 菜单）

**Files:**
- Create: `work/dreamer-v2/backend/src/modules/system/entities/admin-user.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/system/entities/role.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/system/entities/menu.entity.ts`
- Create: `work/dreamer-v2/backend/src/modules/system/entities/rbac.entity.spec.ts`

**Interfaces:**
- Consumes: Task 2 的 TypeORM 配置（`DATABASE_SYNC=true` 自动建表）
- Produces:
  - `AdminUser`：`id`(int PK 自增)、`username`(unique)、`passwordHash`、`nickname`、`isSuper`(boolean, default false)、`status`(1 启用 / 0 禁用)、`createdAt`、`updatedAt`；`roles: Role[]`（ManyToMany）
  - `Role`：`id`、`code`(unique)、`name`、`description`、`createdAt`；`menus: Menu[]`（ManyToMany）；`admins: AdminUser[]`
  - `Menu`：`id`、`parentId`(nullable)、`title`、`path`、`icon`、`type`('dir'|'menu'|'button')、`permissionCode`(unique nullable)、`sort`、`visible`、`createdAt`

- [ ] **Step 1: 编写失败测试（实体结构）**

Create `backend/src/modules/system/entities/rbac.entity.spec.ts`:

```typescript
import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { AdminUser } from './admin-user.entity';
import { Role } from './role.entity';
import { Menu } from './menu.entity';

describe('RBAC entities', () => {
  it('exposes required columns on AdminUser', () => {
    const columns = getMetadataArgsStorage().columns.filter((c) => c.target === AdminUser);
    const names = columns.map((c) => c.propertyName);
    expect(names).toEqual(expect.arrayContaining(['id', 'username', 'passwordHash', 'nickname', 'isSuper', 'status']));
  });

  it('defines admin-role and role-menu join tables', () => {
    const joins = getMetadataArgsStorage().joinTables.map((j) => j.name);
    expect(joins).toEqual(expect.arrayContaining(['admin_role', 'role_menu']));
  });
});
```

Run: `npx jest src/modules/system/entities/rbac.entity.spec.ts` — Expected: FAIL。

- [ ] **Step 2: 创建三个实体**

Create `backend/src/modules/system/entities/admin-user.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Role } from './role.entity';

@Entity('admin_user')
export class AdminUser {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 64 })
  username!: string;

  @Column({ name: 'password_hash', length: 128 })
  passwordHash!: string;

  @Column({ length: 64 })
  nickname!: string;

  @Column({ name: 'is_super', default: false })
  isSuper!: boolean;

  @Column({ default: 1 })
  status!: number;

  @ManyToMany(() => Role, (role) => role.admins)
  @JoinTable({ name: 'admin_role' })
  roles!: Role[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
```

Create `backend/src/modules/system/entities/role.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AdminUser } from './admin-user.entity';
import { Menu } from './menu.entity';

@Entity('role')
export class Role {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 64 })
  code!: string;

  @Column({ length: 64 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @ManyToMany(() => AdminUser, (admin) => admin.roles)
  admins!: AdminUser[];

  @ManyToMany(() => Menu, (menu) => menu.roles)
  @JoinTable({ name: 'role_menu' })
  menus!: Menu[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

Create `backend/src/modules/system/entities/menu.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from './role.entity';

@Entity('menu')
export class Menu {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'parent_id', nullable: true })
  parentId?: number;

  @Column({ length: 64 })
  title!: string;

  @Column({ length: 255, nullable: true })
  path?: string;

  @Column({ length: 64, nullable: true })
  icon?: string;

  @Column({ type: 'varchar', length: 16, default: 'menu' })
  type!: 'dir' | 'menu' | 'button';

  @Column({ name: 'permission_code', unique: true, length: 128, nullable: true })
  permissionCode?: string;

  @Column({ default: 0 })
  sort!: number;

  @Column({ default: true })
  visible!: boolean;

  @ManyToMany(() => Role, (role) => role.menus)
  roles!: Role[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

- [ ] **Step 3: 运行测试验证通过**

Run: `npx jest src/modules/system/entities/rbac.entity.spec.ts`
Expected: PASS。

- [ ] **Step 4: 验证可编译**

Run: `npm run build`
Expected: build 成功。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: rbac entities"
```

---

### Task 6: 认证模块（管理员登录 + JWT）

**Files:**
- Create: `work/dreamer-v2/backend/src/modules/auth/auth.module.ts`
- Create: `work/dreamer-v2/backend/src/modules/auth/auth.service.ts`
- Create: `work/dreamer-v2/backend/src/modules/auth/auth.service.spec.ts`
- Create: `work/dreamer-v2/backend/src/modules/auth/auth.controller.ts`
- Create: `work/dreamer-v2/backend/src/modules/auth/dto/login.dto.ts`
- Create: `work/dreamer-v2/backend/src/modules/auth/jwt.strategy.ts`
- Create: `work/dreamer-v2/backend/src/modules/auth/jwt-auth.guard.ts`
- Create: `work/dreamer-v2/backend/src/modules/auth/current-admin.decorator.ts`
- Modify: `work/dreamer-v2/backend/src/app.module.ts`

**Interfaces:**
- Consumes: Task 2 配置（jwt.secret/expiresIn）、Task 3 异常、Task 5 的 `AdminUser`
- Produces:
  - `POST /api/auth/login`：入参 `{ username: string; password: string }`，返回 `{ accessToken: string; admin: { id: number; username: string; nickname: string; isSuper: boolean } }`；账号不存在/密码错误/禁用分别抛业务异常
  - `JwtAuthGuard`：基于 `AuthGuard('jwt')` 的全局可用守卫
  - `@CurrentAdmin()` 装饰器：从 `req.user` 取出 `{ adminId: number; username: string; isSuper: boolean }`

- [ ] **Step 1: 编写失败测试（AuthService）**

Create `backend/src/modules/auth/auth.service.spec.ts`:

```typescript
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { BusinessException } from '../../common/exceptions/business.exception';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  const repo: any = {
    findOneBy: jest.fn(),
  };
  const jwt: any = { sign: jest.fn(() => 'token-abc') };
  const service = new AuthService(repo, jwt);

  it('throws when username not found', async () => {
    repo.findOneBy.mockResolvedValue(null);
    await expect(service.login('nobody', 'x')).rejects.toThrow(new BusinessException('账号或密码错误', 40100));
  });

  it('throws when password mismatch', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, username: 'admin', passwordHash: bcrypt.hashSync('right', 10), nickname: '超管', isSuper: true, status: 1 });
    await expect(service.login('admin', 'wrong')).rejects.toThrow(new BusinessException('账号或密码错误', 40100));
  });

  it('returns token on success', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, username: 'admin', passwordHash: bcrypt.hashSync('admin123', 10), nickname: '超管', isSuper: true, status: 1 });
    const result = await service.login('admin', 'admin123');
    expect(result.accessToken).toBe('token-abc');
    expect(result.admin.isSuper).toBe(true);
  });
});
```

Run: `npx jest src/modules/auth/auth.service.spec.ts` — Expected: FAIL。

- [ ] **Step 2: 实现 AuthService**

Create `backend/src/modules/auth/auth.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AdminUser } from '../system/entities/admin-user.entity';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminRepo: Repository<AdminUser>,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string): Promise<{ accessToken: string; admin: any }> {
    const admin = await this.adminRepo.findOneBy({ username });
    if (!admin || !bcrypt.compareSync(password, admin.passwordHash)) {
      throw new BusinessException('账号或密码错误', 40100);
    }
    if (admin.status !== 1) {
      throw new BusinessException('账号已禁用', 40101);
    }
    const payload = { sub: admin.id, username: admin.username, isSuper: admin.isSuper };
    return {
      accessToken: this.jwtService.sign(payload),
      admin: { id: admin.id, username: admin.username, nickname: admin.nickname, isSuper: admin.isSuper },
    };
  }
}
```

- [ ] **Step 3: 运行测试验证通过**

Run: `npx jest src/modules/auth/auth.service.spec.ts`
Expected: PASS。

- [ ] **Step 4: 创建 DTO、控制器、策略与守卫**

Create `backend/src/modules/auth/dto/login.dto.ts`:

```typescript
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}
```

Create `backend/src/modules/auth/jwt.strategy.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt.secret'),
    });
  }

  validate(payload: { sub: number; username: string; isSuper: boolean }): { adminId: number; username: string; isSuper: boolean } {
    return { adminId: payload.sub, username: payload.username, isSuper: payload.isSuper };
  }
}
```

Create `backend/src/modules/auth/jwt-auth.guard.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

Create `backend/src/modules/auth/current-admin.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentAdminPayload {
  adminId: number;
  username: string;
  isSuper: boolean;
}

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentAdminPayload => ctx.switchToHttp().getRequest().user,
);
```

Create `backend/src/modules/auth/auth.controller.ts`:

```typescript
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentAdmin, CurrentAdminPayload } from './current-admin.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto): Promise<{ accessToken: string; admin: any }> {
    return this.authService.login(dto.username, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@CurrentAdmin() admin: CurrentAdminPayload): CurrentAdminPayload {
    return admin;
  }
}
```

Create `backend/src/modules/auth/auth.module.ts`（Task 7 会再修改，引入 SystemModule）：

```typescript
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUser } from '../system/entities/admin-user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUser]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.secret'),
        signOptions: { expiresIn: config.get('jwt.expiresIn') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 5: 注册 AuthModule 到根模块**

Modify `backend/src/app.module.ts` imports 数组，加入 `AuthModule`：

```typescript
import { AuthModule } from './modules/auth/auth.module';
// imports: [ ..., AuthModule ]
```

- [ ] **Step 6: 验证构建与测试**

Run: `npm test && npm run build`
Expected: 全部通过。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "feat: admin login with jwt"
```

---

### Task 7: RBAC 权限守卫与系统管理服务

**Files:**
- Create: `work/dreamer-v2/backend/src/modules/system/permissions.decorator.ts`
- Create: `work/dreamer-v2/backend/src/modules/system/permissions.guard.ts`
- Create: `work/dreamer-v2/backend/src/modules/system/permissions.guard.spec.ts`
- Create: `work/dreamer-v2/backend/src/modules/system/admin.service.ts`
- Create: `work/dreamer-v2/backend/src/modules/system/admin.service.spec.ts`
- Create: `work/dreamer-v2/backend/src/modules/system/role.service.ts`
- Create: `work/dreamer-v2/backend/src/modules/system/menu.service.ts`
- Create: `work/dreamer-v2/backend/src/modules/system/system.module.ts`
- Create: `work/dreamer-v2/backend/src/modules/system/admin.controller.ts`
- Create: `work/dreamer-v2/backend/src/modules/system/role.controller.ts`
- Create: `work/dreamer-v2/backend/src/modules/system/menu.controller.ts`
- Create: `work/dreamer-v2/backend/src/modules/system/dto/create-admin.dto.ts`
- Create: `work/dreamer-v2/backend/src/modules/system/dto/assign-roles.dto.ts`
- Create: `work/dreamer-v2/backend/src/modules/system/dto/save-menu.dto.ts`
- Modify: `work/dreamer-v2/backend/src/app.module.ts`

**Interfaces:**
- Consumes: Task 5 实体、Task 6 的 `JwtAuthGuard` / `@CurrentAdmin()`
- Produces:
  - `@Permissions('code1', 'code2')` 元数据装饰器
  - `PermissionsGuard`：配合 `JwtAuthGuard` 使用；超管放行；普通管理员校验其角色绑定的菜单 permissionCode 是否包含所需权限码，缺失抛 `BusinessException('无权限', 40300)`
  - `AdminService`：`createAdmin(operator, dto)`（非超管抛 `BusinessException('只有超级管理员可以创建账户', 40301)`）、`assignRoles(operator, adminId, roleIds)`（同样限超管）、`page(page, pageSize)`、`toggleStatus(operator, id)`、`menusOf(adminId)`（返回当前管理员可见菜单树）
  - `RoleService` / `MenuService`：CRUD，另提供 `assignMenus(roleId, menuIds)`
  - `GET /api/auth/menus` 在 AuthController 增加（转发到 AdminService.menusOf）

- [ ] **Step 1: 编写失败测试（PermissionsGuard）**

Create `backend/src/modules/system/permissions.guard.spec.ts`:

```typescript
import { PermissionsGuard } from './permissions.guard';
import { BusinessException } from '../../common/exceptions/business.exception';

describe('PermissionsGuard', () => {
  function makeContext(user: any, permissions: string[]): any {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };
  }

  it('allows super admin without permission check', async () => {
    const reflector = { getAllAndOverride: jest.fn(() => ['system:admin:create']) };
    const service = { getPermissionCodes: jest.fn() };
    const guard = new PermissionsGuard(reflector as any, service as any);
    await expect(guard.canActivate(makeContext({ isSuper: true }, []))).resolves.toBe(true);
  });

  it('rejects non-super admin missing permission', async () => {
    const reflector = { getAllAndOverride: jest.fn(() => ['system:admin:create']) };
    const service = { getPermissionCodes: jest.fn().mockResolvedValue(['system:role:list']) };
    const guard = new PermissionsGuard(reflector as any, service as any);
    await expect(guard.canActivate(makeContext({ isSuper: false, adminId: 2 }, []))).rejects.toThrow(
      new BusinessException('无权限', 40300),
    );
  });
});
```

Run: `npx jest src/modules/system/permissions.guard.spec.ts` — Expected: FAIL。

- [ ] **Step 2: 实现权限装饰器与守卫**

Create `backend/src/modules/system/permissions.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...codes: string[]) => SetMetadata(PERMISSIONS_KEY, codes);
```

Create `backend/src/modules/system/permissions.guard.ts`:

```typescript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { BusinessException } from '../../common/exceptions/business.exception';
import { AdminService } from './admin.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly adminService: AdminService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user = context.switchToHttp().getRequest().user;
    if (user?.isSuper) return true;
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;
    const owned = await this.adminService.getPermissionCodes(user.adminId);
    if (!required.every((code) => owned.includes(code))) {
      throw new BusinessException('无权限', 40300);
    }
    return true;
  }
}
```

注意：`PermissionsGuard` 在运行时注入 `AdminService`，两者同属 SystemModule，无同模块循环；真正的循环在 SystemModule 与 AuthModule 之间（互相引用对方 provider），由 Step 7 的 `forwardRef` 处理。

- [ ] **Step 3: 运行测试验证通过**

Run: `npx jest src/modules/system/permissions.guard.spec.ts`
Expected: PASS。

- [ ] **Step 4: 实现 AdminService / RoleService / MenuService 与 DTO**

Create `backend/src/modules/system/dto/create-admin.dto.ts`:

```typescript
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAdminDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  nickname!: string;

  @IsBoolean()
  @IsOptional()
  isSuper?: boolean;

  @IsArray()
  @IsOptional()
  roleIds?: number[];
}
```

Create `backend/src/modules/system/dto/assign-roles.dto.ts`:

```typescript
import { IsArray, ArrayNotEmpty } from 'class-validator';

export class AssignRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  roleIds!: number[];
}
```

Create `backend/src/modules/system/dto/save-menu.dto.ts`:

```typescript
import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class SaveMenuDto {
  @IsOptional()
  @IsNumber()
  parentId?: number;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsIn(['dir', 'menu', 'button'])
  type!: 'dir' | 'menu' | 'button';

  @IsOptional()
  @IsString()
  permissionCode?: string;

  @IsOptional()
  @IsNumber()
  sort?: number;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}
```

Create `backend/src/modules/system/admin.service.ts`:

```typescript
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AdminUser } from './entities/admin-user.entity';
import { Role } from './entities/role.entity';
import { Menu } from './entities/menu.entity';
import { BusinessException } from '../../common/exceptions/business.exception';
import { BaseService } from '../../common/base/base.service';
import { CreateAdminDto } from './dto/create-admin.dto';

@Injectable()
export class AdminService extends BaseService<AdminUser> {
  constructor(
    @InjectRepository(AdminUser)
    repo: Repository<AdminUser>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Menu)
    private readonly menuRepo: Repository<Menu>,
  ) {
    super(repo);
  }

  private assertSuper(operator: { isSuper: boolean }): void {
    if (!operator.isSuper) throw new BusinessException('只有超级管理员可以创建账户', 40301);
  }

  async createAdmin(operator: { isSuper: boolean }, dto: CreateAdminDto): Promise<AdminUser> {
    this.assertSuper(operator);
    const exists = await this.repo.findOneBy({ username: dto.username });
    if (exists) throw new BusinessException('用户名已存在', 40010);
    const admin = this.repo.create({
      username: dto.username,
      passwordHash: bcrypt.hashSync(dto.password, 10),
      nickname: dto.nickname,
      isSuper: dto.isSuper ?? false,
      roles: dto.roleIds?.length ? (await this.roleRepo.findBy({ id: In(dto.roleIds) })) : [],
    });
    return this.repo.save(admin);
  }

  async assignRoles(operator: { isSuper: boolean }, adminId: number, roleIds: number[]): Promise<AdminUser> {
    this.assertSuper(operator);
    const admin = await this.findOne(adminId);
    admin.roles = await this.roleRepo.findBy({ id: In(roleIds) });
    return this.repo.save(admin);
  }

  async toggleStatus(operator: { isSuper: boolean }, id: number): Promise<AdminUser> {
    this.assertSuper(operator);
    const admin = await this.findOne(id);
    if (admin.isSuper) throw new BusinessException('不能禁用超级管理员', 40302);
    admin.status = admin.status === 1 ? 0 : 1;
    return this.repo.save(admin);
  }

  async getPermissionCodes(adminId: number): Promise<string[]> {
    const admin = await this.repo.findOne({
      where: { id: adminId },
      relations: { roles: { menus: true } },
    });
    const codes = (admin?.roles ?? []).flatMap((r) => (r.menus ?? []).map((m) => m.permissionCode).filter(Boolean));
    return [...new Set(codes)] as string[];
  }

  async menusOf(adminId: number): Promise<Menu[]> {
    const codes = await this.getPermissionCodes(adminId);
    const admin = await this.repo.findOneBy({ id: adminId });
    if (admin?.isSuper) {
      return this.menuRepo.find({ where: { visible: true }, order: { sort: 'ASC' } });
    }
    return this.menuRepo.find({
      where: { visible: true, permissionCode: In(codes.length ? codes : ['__none__']) },
      order: { sort: 'ASC' },
    });
  }
}
```

Create `backend/src/modules/system/role.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Menu } from './entities/menu.entity';
import { BaseService } from '../../common/base/base.service';

@Injectable()
export class RoleService extends BaseService<Role> {
  constructor(
    @InjectRepository(Role) repo: Repository<Role>,
    @InjectRepository(Menu) private readonly menuRepo: Repository<Menu>,
  ) {
    super(repo);
  }

  async assignMenus(roleId: number, menuIds: number[]): Promise<Role> {
    const role = await this.findOne(roleId);
    role.menus = await this.menuRepo.findBy({ id: In(menuIds) });
    return this.repo.save(role);
  }
}
```

Create `backend/src/modules/system/menu.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { Menu } from './entities/menu.entity';
import { BaseService } from '../../common/base/base.service';

@Injectable()
export class MenuService extends BaseService<Menu> {}
```

- [ ] **Step 5: 编写失败测试（AdminService 超管限制）**

Create `backend/src/modules/system/admin.service.spec.ts`:

```typescript
import { AdminService } from './admin.service';
import { BusinessException } from '../../common/exceptions/business.exception';

describe('AdminService', () => {
  const repo: any = { findOneBy: jest.fn(), findOne: jest.fn(), findBy: jest.fn(), create: jest.fn(), save: jest.fn() };
  const roleRepo: any = { findBy: jest.fn() };
  const menuRepo: any = { find: jest.fn(), findBy: jest.fn() };
  const service = new AdminService(repo, roleRepo, menuRepo);

  it('rejects non-super admin creating accounts', async () => {
    await expect(service.createAdmin({ isSuper: false }, { username: 'x', password: 'x', nickname: 'x' } as any))
      .rejects.toThrow(new BusinessException('只有超级管理员可以创建账户', 40301));
  });

  it('rejects disabling a super admin', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, isSuper: true, status: 1 });
    await expect(service.toggleStatus({ isSuper: true }, 1)).rejects.toThrow(new BusinessException('不能禁用超级管理员', 40302));
  });
});
```

Run: `npx jest src/modules/system/admin.service.spec.ts` — Expected: FAIL。

- [ ] **Step 6: 运行测试验证通过**

Run: `npx jest src/modules/system/admin.service.spec.ts`
Expected: PASS。

- [ ] **Step 7: 创建控制器与模块**

Create `backend/src/modules/system/system.module.ts`:

```typescript
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AdminUser } from './entities/admin-user.entity';
import { Role } from './entities/role.entity';
import { Menu } from './entities/menu.entity';
import { AdminService } from './admin.service';
import { RoleService } from './role.service';
import { MenuService } from './menu.service';
import { AdminController } from './admin.controller';
import { RoleController } from './role.controller';
import { MenuController } from './menu.controller';
import { PermissionsGuard } from './permissions.guard';

@Module({
  imports: [TypeOrmModule.forFeature([AdminUser, Role, Menu]), forwardRef(() => AuthModule)],
  controllers: [AdminController, RoleController, MenuController],
  providers: [AdminService, RoleService, MenuService, PermissionsGuard],
  exports: [AdminService, PermissionsGuard],
})
export class SystemModule {}
```

说明：SystemModule 的控制器使用 `JwtAuthGuard`（来自 AuthModule），AuthModule 的控制器使用 `AdminService`（来自 SystemModule），两个模块互相引用，必须用 `forwardRef` 打破循环。AuthModule 的对应修改见 Task 7 Step 8。

Create `backend/src/modules/system/admin.controller.ts`:

```typescript
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { Permissions } from './permissions.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../auth/current-admin.decorator';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { AdminUser } from './entities/admin-user.entity';
import { PageResult } from '../../common/base/page-result';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('system/admins')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @Permissions('system:admin:list')
  page(@Query('page') page = 1, @Query('pageSize') pageSize = 10): Promise<PageResult<AdminUser>> {
    return this.adminService.page(Number(page), Number(pageSize));
  }

  @Post()
  @Permissions('system:admin:create')
  create(@CurrentAdmin() operator: CurrentAdminPayload, @Body() dto: CreateAdminDto): Promise<AdminUser> {
    return this.adminService.createAdmin(operator, dto);
  }

  @Put(':id/roles')
  @Permissions('system:admin:assign-role')
  assignRoles(
    @CurrentAdmin() operator: CurrentAdminPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignRolesDto,
  ): Promise<AdminUser> {
    return this.adminService.assignRoles(operator, id, dto.roleIds);
  }

  @Put(':id/status')
  @Permissions('system:admin:list')
  toggleStatus(
    @CurrentAdmin() operator: CurrentAdminPayload,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AdminUser> {
    return this.adminService.toggleStatus(operator, id);
  }

  @Delete(':id')
  @Permissions('system:admin:delete')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ id: number }> {
    await this.adminService.remove(id);
    return { id };
  }
}
```

Create `backend/src/modules/system/role.controller.ts`:

```typescript
import { Body, Controller, Param, ParseIntPipe, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { Permissions } from './permissions.decorator';
import { RoleService } from './role.service';
import { Role } from './entities/role.entity';
import { BaseController } from '../../common/base/base.controller';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('system/roles')
export class RoleController extends BaseController<Role> {
  constructor(private readonly roleService: RoleService) {
    super(roleService);
  }

  @Put(':id/menus')
  @Permissions('system:role:assign-menu')
  assignMenus(@Param('id', ParseIntPipe) id: number, @Body('menuIds') menuIds: number[]): Promise<Role> {
    return this.roleService.assignMenus(id, menuIds);
  }
}
```

注意：BaseController 内的 `create/update` 需要补充 `@Permissions('system:role:create')` 等守卫元数据，本任务的权限校验重点在列表与授权接口；如需要，可在后续任务统一加注解。

Create `backend/src/modules/system/menu.controller.ts`:

```typescript
import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { MenuService } from './menu.service';
import { Menu } from './entities/menu.entity';
import { BaseController } from '../../common/base/base.controller';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('system/menus')
export class MenuController extends BaseController<Menu> {
  constructor(private readonly menuService: MenuService) {
    super(menuService);
  }
}
```

- [ ] **Step 8: 增加当前管理员菜单接口**

Modify `backend/src/modules/auth/auth.controller.ts`，注入 `AdminService` 并增加 `GET /api/auth/menus`：

```typescript
import { AdminService } from '../system/admin.service';
// constructor(private readonly authService: AuthService, private readonly adminService: AdminService) {}

@UseGuards(JwtAuthGuard)
@Get('menus')
menus(@CurrentAdmin() admin: CurrentAdminPayload) {
  return this.adminService.menusOf(admin.adminId);
}
```

修改 `backend/src/modules/auth/auth.module.ts`，加入 `forwardRef` 与 SystemModule，并导出 `JwtAuthGuard`：

```typescript
import { forwardRef, Module } from '@nestjs/common';
// ... 其余 import 保持不变
import { SystemModule } from '../system/system.module';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    // ... 原有 TypeOrmModule.forFeature / PassportModule / JwtModule.registerAsync
    forwardRef(() => SystemModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
```

- [ ] **Step 9: 注册 SystemModule 到根模块**

Modify `backend/src/app.module.ts`，加入 `SystemModule`。

- [ ] **Step 10: 验证测试与构建**

Run: `npm test && npm run build`
Expected: 全部通过。

- [ ] **Step 11: 提交**

```bash
git add -A
git commit -m "feat: rbac guards and system management services"
```

---

### Task 8: 初始化脚本（超管 + 基础菜单 + 角色）

**Files:**
- Create: `work/dreamer-v2/backend/src/seed.ts`
- Modify: `work/dreamer-v2/backend/package.json`（增加 `seed` 脚本）

**Interfaces:**
- Consumes: Task 5/7 的实体与模块
- Produces: 空库执行 `npm run seed` 后生成：
  - 超级管理员：`admin` / `admin123`（bcrypt 加密）
  - 基础菜单：仪表盘（`/dashboard`）、会员管理（dir）、租赁管理（dir）、系统管理（dir，含 管理员/角色/菜单 子菜单与按钮权限码 `system:*`）
  - 角色：`superadmin`（绑定全部菜单）

- [ ] **Step 1: 编写 seed 脚本**

Create `backend/src/seed.ts`:

```typescript
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AdminUser } from './modules/system/entities/admin-user.entity';
import { Role } from './modules/system/entities/role.entity';
import { Menu } from './modules/system/entities/menu.entity';
import configuration from './config/configuration';

async function seed(): Promise<void> {
  const db = configuration().database as any;
  const dataSource = new DataSource({
    type: 'mysql',
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.database,
    entities: [AdminUser, Role, Menu],
    synchronize: true,
    charset: 'utf8mb4',
  });
  await dataSource.initialize();

  const menuRepo = dataSource.getRepository(Menu);
  interface MenuDef {
    key: string;
    title: string;
    path?: string;
    type: 'dir' | 'menu' | 'button';
    permissionCode: string;
    sort: number;
    parent?: string;
  }

  const menuDefs: MenuDef[] = [
    { key: 'dashboard', title: '仪表盘', path: '/dashboard', type: 'menu', permissionCode: 'dashboard', sort: 1 },
    { key: 'member', title: '会员管理', path: '/member', type: 'dir', permissionCode: 'member', sort: 10 },
    { key: 'rental', title: '租赁管理', path: '/rental', type: 'dir', permissionCode: 'rental', sort: 20 },
    { key: 'system', title: '系统管理', path: '/system', type: 'dir', permissionCode: 'system', sort: 99 },
    { key: 'system-admin', title: '管理员管理', path: '/system/admin', type: 'menu', permissionCode: 'system:admin:list', sort: 1, parent: 'system' },
    { key: 'system-admin-create', title: '新增管理员', type: 'button', permissionCode: 'system:admin:create', sort: 1, parent: 'system' },
    { key: 'system-admin-assign-role', title: '分配角色', type: 'button', permissionCode: 'system:admin:assign-role', sort: 2, parent: 'system' },
    { key: 'system-admin-delete', title: '删除管理员', type: 'button', permissionCode: 'system:admin:delete', sort: 3, parent: 'system' },
    { key: 'system-role', title: '角色管理', path: '/system/role', type: 'menu', permissionCode: 'system:role:list', sort: 2, parent: 'system' },
    { key: 'system-role-assign-menu', title: '角色授权', type: 'button', permissionCode: 'system:role:assign-menu', sort: 1, parent: 'system' },
    { key: 'system-menu', title: '菜单管理', path: '/system/menu', type: 'menu', permissionCode: 'system:menu:list', sort: 3, parent: 'system' },
  ];

  const saved: Menu[] = [];
  for (const def of menuDefs) {
    const parent = def.parent ? saved.find((m) => (m as any).key === def.parent) : undefined;
    const menu = menuRepo.create({
      title: def.title,
      path: def.path || undefined,
      type: def.type as any,
      permissionCode: def.permissionCode,
      sort: def.sort,
      parentId: parent?.id,
    });
    (menu as any).key = def.key;
    saved.push(await menuRepo.save(menu));
  }

  const roleRepo = dataSource.getRepository(Role);
  const role = await roleRepo.save(roleRepo.create({ code: 'superadmin', name: '超级管理员', description: '全部权限', menus: saved }));

  const adminRepo = dataSource.getRepository(AdminUser);
  await adminRepo.save(
    adminRepo.create({
      username: 'admin',
      passwordHash: bcrypt.hashSync('admin123', 10),
      nickname: '超级管理员',
      isSuper: true,
      roles: [role],
    }),
  );

  console.log('Seed done: admin/admin123');
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: 增加 npm 脚本**

Modify `backend/package.json` scripts：

```json
{
  "scripts": {
    "seed": "ts-node src/seed.ts"
  }
}
```

若未安装 `ts-node`，运行 `npm install -D ts-node`。

- [ ] **Step 3: 本地验证（需要 MySQL 可用）**

在本地 MySQL 中创建库与账号（或直接使用服务器数据库）：

```sql
CREATE DATABASE IF NOT EXISTS dreamer_v2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'dreamer_v2'@'%' IDENTIFIED BY 'dreamer_v2';
GRANT ALL PRIVILEGES ON dreamer_v2.* TO 'dreamer_v2'@'%';
FLUSH PRIVILEGES;
```

Run: `npm run seed`
Expected: 输出 `Seed done: admin/admin123`。

- [ ] **Step 4: 验证登录接口（后端已启动时）**

```powershell
Start-Process -WindowStyle Hidden -FilePath npm -ArgumentList 'run','start:dev'
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:3000/api/auth/login' -ContentType 'application/json' -Body '{"username":"admin","password":"admin123"}'
```

Expected: 返回 `{ code: 0, data: { accessToken, admin: { isSuper: true } } }`。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: seed super admin, roles and menus"
```

---

### Task 9: 管理后台脚手架与登录流程

**Files:**
- Create: `work/dreamer-v2/admin/`（Vite 生成）
- Create: `work/dreamer-v2/admin/src/api/request.ts`
- Create: `work/dreamer-v2/admin/src/api/auth.ts`
- Create: `work/dreamer-v2/admin/src/stores/auth.ts`
- Create: `work/dreamer-v2/admin/src/stores/auth.spec.ts`
- Create: `work/dreamer-v2/admin/src/router/index.ts`
- Create: `work/dreamer-v2/admin/src/layout/Layout.vue`
- Create: `work/dreamer-v2/admin/src/views/Login.vue`
- Create: `work/dreamer-v2/admin/src/views/Dashboard.vue`
- Modify: `work/dreamer-v2/admin/src/main.ts`
- Modify: `work/dreamer-v2/admin/vite.config.ts`
- Create: `work/dreamer-v2/admin/.env.development`

**Interfaces:**
- Consumes: 后端 `POST /api/auth/login`、`GET /api/auth/menus`（带 Bearer Token）
- Produces:
  - `request<T>(config): Promise<T>`：axios 封装，自动附加 token，响应拦截器解包 `data`；401 时清 token 跳登录
  - `authApi.login(username, password)`、`authApi.fetchMenus()`
  - `useAuthStore`：`token`、`admin`、`menus`；`login()`、`loadProfile()`、`logout()`
  - 路由守卫：无 token 跳 `/login`；登录后从后端拉菜单并动态注册

- [ ] **Step 1: 生成 Vite 项目并安装依赖**

```powershell
Set-Location 'C:\Users\97157\Documents\Codex\2026-08-06\lia\work\dreamer-v2'
npm create vite@5 admin -- --template vue-ts
Set-Location 'C:\Users\97157\Documents\Codex\2026-08-06\lia\work\dreamer-v2\admin'
npm install
npm install element-plus @element-plus/icons-vue pinia vue-router axios
npm install -D vitest @vue/test-utils jsdom
```

Expected: `admin/` 目录生成且依赖安装完成。

- [ ] **Step 2: 配置 Vite 代理与测试环境**

Modify `admin/vite.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

Create `admin/.env.development`:

```env
VITE_API_BASE_URL=/api
```

Modify `admin/src/main.ts`:

```typescript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import App from './App.vue';
import router from './router';

createApp(App).use(createPinia()).use(router).use(ElementPlus).mount('#app');
```

- [ ] **Step 3: 编写失败测试（auth store）**

Create `admin/src/stores/auth.spec.ts`:

```typescript
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from './auth';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../api/auth', () => ({
  authApi: {
    login: vi.fn().mockResolvedValue({ accessToken: 't1', admin: { id: 1, username: 'admin', nickname: '超管', isSuper: true } }),
    fetchMenus: vi.fn().mockResolvedValue([]),
  },
}));

describe('auth store', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('stores token and admin after login', async () => {
    const store = useAuthStore();
    await store.login('admin', 'admin123');
    expect(store.token).toBe('t1');
    expect(store.admin?.isSuper).toBe(true);
  });
});
```

Run: `npx vitest run src/stores/auth.spec.ts` — Expected: FAIL。

- [ ] **Step 4: 实现 api 封装与 store**

Create `admin/src/api/request.ts`:

```typescript
import axios from 'axios';
import { ElMessage } from 'element-plus';

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
});

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

request.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body.code === 0) return body.data;
    ElMessage.error(body.message || '请求失败');
    return Promise.reject(new Error(body.message));
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else {
      ElMessage.error(error.response?.data?.message || error.message || '网络错误');
    }
    return Promise.reject(error);
  },
);

export default request;
```

Create `admin/src/api/auth.ts`:

```typescript
import request from './request';

export interface LoginResult {
  accessToken: string;
  admin: { id: number; username: string; nickname: string; isSuper: boolean };
}

export const authApi = {
  login: (username: string, password: string) =>
    request.post<LoginResult, LoginResult>('/auth/login', { username, password }),
  fetchMenus: () => request.get('/auth/menus'),
};
```

Create `admin/src/stores/auth.ts`:

```typescript
import { defineStore } from 'pinia';
import { authApi, LoginResult } from '../api/auth';

interface MenuItem {
  id: number;
  parentId?: number;
  title: string;
  path?: string;
  icon?: string;
  type: string;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    admin: null as LoginResult['admin'] | null,
    menus: [] as MenuItem[],
  }),
  actions: {
    async login(username: string, password: string) {
      const result = await authApi.login(username, password);
      this.token = result.accessToken;
      this.admin = result.admin;
      localStorage.setItem('token', result.accessToken);
      this.menus = (await authApi.fetchMenus()) as MenuItem[];
    },
    async loadMenus() {
      this.menus = (await authApi.fetchMenus()) as MenuItem[];
    },
    logout() {
      this.token = '';
      this.admin = null;
      this.menus = [];
      localStorage.removeItem('token');
    },
  },
});
```

- [ ] **Step 5: 运行测试验证通过**

Run: `npx vitest run src/stores/auth.spec.ts`
Expected: PASS。

- [ ] **Step 6: 实现路由与布局**

Create `admin/src/router/index.ts`:

```typescript
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue'), meta: { public: true } },
  { path: '/', component: () => import('../layout/Layout.vue'), children: [
    { path: '', redirect: '/dashboard' },
    { path: 'dashboard', name: 'Dashboard', component: () => import('../views/Dashboard.vue') },
  ]},
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach(async (to) => {
  const store = useAuthStore();
  if (to.meta.public) return true;
  if (!store.token) return { path: '/login' };
  if (!store.menus.length) await store.loadMenus();
  return true;
});

export default router;
```

Create `admin/src/layout/Layout.vue`：

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const store = useAuthStore();
const router = useRouter();

const menus = computed(() => store.menus.filter((m) => m.type !== 'button'));

function logout() {
  store.logout();
  router.push('/login');
}
</script>

<template>
  <el-container style="height: 100vh">
    <el-aside width="220px">
      <div style="padding: 16px; font-weight: 600">造梦者管理后台</div>
      <el-menu router :default-active="$route.path">
        <el-menu-item v-for="m in menus" :key="m.id" :index="m.path || ''">
          {{ m.title }}
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header style="display: flex; justify-content: flex-end; align-items: center">
        <el-button text @click="logout">退出登录</el-button>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>
```

Create `admin/src/views/Login.vue`：

```vue
<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../stores/auth';

const store = useAuthStore();
const router = useRouter();
const loading = ref(false);
const form = reactive({ username: 'admin', password: '' });

async function submit() {
  loading.value = true;
  try {
    await store.login(form.username, form.password);
    ElMessage.success('登录成功');
    router.push('/dashboard');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div style="display: flex; justify-content: center; align-items: center; height: 100vh">
    <el-card style="width: 360px">
      <h3 style="text-align: center">造梦者管理后台</h3>
      <el-form :model="form" @submit.prevent="submit">
        <el-form-item><el-input v-model="form.username" placeholder="用户名" /></el-form-item>
        <el-form-item><el-input v-model="form.password" type="password" placeholder="密码" show-password /></el-form-item>
        <el-button type="primary" style="width: 100%" :loading="loading" @click="submit">登录</el-button>
      </el-form>
    </el-card>
  </div>
</template>
```

Create `admin/src/views/Dashboard.vue`：

```vue
<template>
  <el-card>
    <h3>数据看板</h3>
    <p>后续计划将在此展示场地租赁订单、会员增长等数据。</p>
  </el-card>
</template>
```

- [ ] **Step 7: 验证构建**

Run: `npm run build`
Expected: build 成功。

- [ ] **Step 8: 手动验收登录流程（后端已启动）**

Run: `npm run dev`
打开 `http://127.0.0.1:5173/login`，输入 `admin/admin123`。
Expected: 登录成功跳转 `/dashboard`，侧边栏显示 seed 的菜单（仪表盘、会员管理、租赁管理、系统管理）。

- [ ] **Step 9: 提交**

```bash
git add -A
git commit -m "feat: admin scaffold with login and dynamic menus"
```

---

### Task 10: 系统管理页面（管理员 / 角色 / 菜单）

**Files:**
- Create: `work/dreamer-v2/admin/src/views/system/AdminList.vue`
- Create: `work/dreamer-v2/admin/src/views/system/RoleList.vue`
- Create: `work/dreamer-v2/admin/src/views/system/MenuList.vue`
- Create: `work/dreamer-v2/admin/src/api/system.ts`
- Modify: `work/dreamer-v2/admin/src/router/index.ts`（注册三个子路由）

**Interfaces:**
- Consumes: 后端 `GET/POST/PUT/DELETE /api/system/admins|roles|menus`、`PUT /api/system/roles/:id/menus`
- Produces: 三个可用的管理页面：
  - `AdminList.vue`：管理员表格（新增、分配角色、启用/禁用、删除）；只有超管显示新增按钮
  - `RoleList.vue`：角色表格（新增、编辑、菜单授权）
  - `MenuList.vue`：菜单表格（新增、编辑、删除）

- [ ] **Step 1: 创建 api/system.ts**

Create `admin/src/api/system.ts`:

```typescript
import request from './request';

export const systemApi = {
  adminPage: (page: number, pageSize: number) => request.get('/system/admins', { params: { page, pageSize } }),
  createAdmin: (data: any) => request.post('/system/admins', data),
  assignRoles: (id: number, roleIds: number[]) => request.put(`/system/admins/${id}/roles`, { roleIds }),
  toggleStatus: (id: number) => request.put(`/system/admins/${id}/status`),
  deleteAdmin: (id: number) => request.delete(`/system/admins/${id}`),

  rolePage: (page: number, pageSize: number) => request.get('/system/roles', { params: { page, pageSize } }),
  createRole: (data: any) => request.post('/system/roles', data),
  updateRole: (id: number, data: any) => request.put(`/system/roles/${id}`, data),
  assignMenus: (id: number, menuIds: number[]) => request.put(`/system/roles/${id}/menus`, { menuIds }),
  deleteRole: (id: number) => request.delete(`/system/roles/${id}`),

  menuPage: (page: number, pageSize: number) => request.get('/system/menus', { params: { page, pageSize } }),
  createMenu: (data: any) => request.post('/system/menus', data),
  updateMenu: (id: number, data: any) => request.put(`/system/menus/${id}`, data),
  deleteMenu: (id: number) => request.delete(`/system/menus/${id}`),
};
```

- [ ] **Step 2: 编写 AdminList.vue**

Create `admin/src/views/system/AdminList.vue`：

```vue
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { systemApi } from '../../api/system';
import { useAuthStore } from '../../stores/auth';

const store = useAuthStore();
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const dialogVisible = ref(false);
const form = reactive({ username: '', password: '', nickname: '', isSuper: false, roleIds: [] as number[] });

async function load() {
  const res: any = await systemApi.adminPage(page.value, pageSize.value);
  list.value = res.list;
  total.value = res.total;
}

async function submit() {
  await systemApi.createAdmin(form);
  ElMessage.success('创建成功');
  dialogVisible.value = false;
  load();
}

async function toggle(item: any) {
  await systemApi.toggleStatus(item.id);
  ElMessage.success('状态已更新');
  load();
}

async function remove(item: any) {
  await ElMessageBox.confirm(`确定删除管理员「${item.nickname}」？`, '提示');
  await systemApi.deleteAdmin(item.id);
  ElMessage.success('已删除');
  load();
}

onMounted(load);
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>管理员管理</h3>
      <el-button v-if="store.admin?.isSuper" type="primary" @click="dialogVisible = true">新增管理员</el-button>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="nickname" label="昵称" />
      <el-table-column label="超级管理员" width="110">
        <template #default="{ row }">{{ row.isSuper ? '是' : '否' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">{{ row.status === 1 ? '启用' : '禁用' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button v-if="store.admin?.isSuper" link type="primary" @click="toggle(row)">启用/禁用</el-button>
          <el-button v-if="store.admin?.isSuper" link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />

    <el-dialog v-model="dialogVisible" title="新增管理员" width="480">
      <el-form :model="form" label-width="90px">
        <el-form-item label="用户名"><el-input v-model="form.username" /></el-form-item>
        <el-form-item label="密码"><el-input v-model="form.password" type="password" show-password /></el-form-item>
        <el-form-item label="昵称"><el-input v-model="form.nickname" /></el-form-item>
        <el-form-item label="超级管理员"><el-switch v-model="form.isSuper" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>
```

- [ ] **Step 3: 编写 RoleList.vue**

Create `admin/src/views/system/RoleList.vue`：

```vue
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { systemApi } from '../../api/system';

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const dialogVisible = ref(false);
const menuDialogVisible = ref(false);
const form = reactive({ code: '', name: '', description: '' });
const menus = ref<any[]>([]);
const checkedMenus = ref<number[]>([]);
const currentRole = ref<any>(null);

async function load() {
  const res: any = await systemApi.rolePage(page.value, pageSize.value);
  list.value = res.list;
  total.value = res.total;
}

async function loadMenus() {
  const res: any = await systemApi.menuPage(1, 200);
  menus.value = res.list;
}

async function submit() {
  await systemApi.createRole(form);
  ElMessage.success('创建成功');
  dialogVisible.value = false;
  load();
}

async function openMenuDialog(role: any) {
  currentRole.value = role;
  await loadMenus();
  menuDialogVisible.value = true;
}

async function saveMenus() {
  await systemApi.assignMenus(currentRole.value.id, checkedMenus.value);
  ElMessage.success('授权成功');
  menuDialogVisible.value = false;
}

async function remove(role: any) {
  await ElMessageBox.confirm(`确定删除角色「${role.name}」？`, '提示');
  await systemApi.deleteRole(role.id);
  ElMessage.success('已删除');
  load();
}

onMounted(load);
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>角色管理</h3>
      <el-button type="primary" @click="dialogVisible = true">新增角色</el-button>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="code" label="编码" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="description" label="说明" />
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button link type="primary" @click="openMenuDialog(row)">菜单授权</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />

    <el-dialog v-model="dialogVisible" title="新增角色" width="480">
      <el-form :model="form" label-width="90px">
        <el-form-item label="编码"><el-input v-model="form.code" /></el-form-item>
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="说明"><el-input v-model="form.description" type="textarea" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="menuDialogVisible" title="菜单授权" width="480">
      <el-checkbox-group v-model="checkedMenus">
        <el-checkbox v-for="m in menus" :key="m.id" :value="m.id">{{ m.title }}</el-checkbox>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="menuDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveMenus">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>
```

- [ ] **Step 4: 编写 MenuList.vue**

Create `admin/src/views/system/MenuList.vue`：

```vue
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { systemApi } from '../../api/system';

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const dialogVisible = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({ title: '', path: '', icon: '', type: 'menu', permissionCode: '', sort: 0, parentId: undefined as number | undefined });

async function load() {
  const res: any = await systemApi.menuPage(page.value, pageSize.value);
  list.value = res.list;
  total.value = res.total;
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, { title: '', path: '', icon: '', type: 'menu', permissionCode: '', sort: 0, parentId: undefined });
  dialogVisible.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  Object.assign(form, row);
  dialogVisible.value = true;
}

async function submit() {
  if (editingId.value) {
    await systemApi.updateMenu(editingId.value, form);
  } else {
    await systemApi.createMenu(form);
  }
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  load();
}

async function remove(row: any) {
  await ElMessageBox.confirm(`确定删除菜单「${row.title}」？`, '提示');
  await systemApi.deleteMenu(row.id);
  ElMessage.success('已删除');
  load();
}

onMounted(load);
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>菜单管理</h3>
      <el-button type="primary" @click="openCreate">新增菜单</el-button>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="title" label="标题" />
      <el-table-column prop="path" label="路径" />
      <el-table-column prop="type" label="类型" width="80" />
      <el-table-column prop="permissionCode" label="权限码" />
      <el-table-column prop="sort" label="排序" width="70" />
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑菜单' : '新增菜单'" width="520">
      <el-form :model="form" label-width="100px">
        <el-form-item label="标题"><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="路径"><el-input v-model="form.path" /></el-form-item>
        <el-form-item label="图标"><el-input v-model="form.icon" /></el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type">
            <el-option label="目录" value="dir" />
            <el-option label="菜单" value="menu" />
            <el-option label="按钮" value="button" />
          </el-select>
        </el-form-item>
        <el-form-item label="权限码"><el-input v-model="form.permissionCode" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>
```

- [ ] **Step 5: 注册系统管理路由**

Modify `admin/src/router/index.ts`，在 Layout 子路由追加：

```typescript
{ path: 'system/admin', name: 'SystemAdmin', component: () => import('../views/system/AdminList.vue') },
{ path: 'system/role', name: 'SystemRole', component: () => import('../views/system/RoleList.vue') },
{ path: 'system/menu', name: 'SystemMenu', component: () => import('../views/system/MenuList.vue') },
```

- [ ] **Step 6: 验证构建**

Run: `npm run build`
Expected: build 成功。

- [ ] **Step 7: 手动验收**

Run: `npm run dev`，登录后进入系统管理三个页面，分别执行：
- 新增一个普通管理员，用其账号登录，确认其看不到“新增管理员”按钮、调用无权限接口返回“无权限”
- 给角色勾选菜单并保存，重新登录后侧边栏菜单随之变化
Expected: 全部符合预期。

- [ ] **Step 8: 提交**

```bash
git add -A
git commit -m "feat: system management pages"
```

---

## 计划自检

**Spec 覆盖：** 本计划覆盖设计文档第 2.2（管理后台）、2.3（技术底座）、3.3 平台区（RBAC/操作日志框架预留）与「单商户多账户、超管建账户」规则；会员注册防批量（第 4.0 节）属于 H5 计划；租赁/会员业务属于后续计划。

**占位符扫描：** 无 TBD/TODO；所有代码步骤均包含具体代码与运行/验收命令。

**类型一致性：** `LoginDto`、`CreateAdminDto`、`PageResult<T>`、`CurrentAdminPayload` 等命名在前后任务中一致；后端 `code === 0` 与前端拦截器解包 `body.data` 对应。
