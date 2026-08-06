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
