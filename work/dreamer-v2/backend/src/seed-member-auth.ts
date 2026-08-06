import 'dotenv/config';
import 'reflect-metadata';
import { DataSource, IsNull } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import configuration from './config/configuration';
import { Member } from './modules/member/entities/member.entity';
import { MemberLevel } from './modules/member/entities/member-level.entity';
import { MemberTag } from './modules/member/entities/member-tag.entity';

async function backfillMemberAuth(): Promise<void> {
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

  const memberRepo = ds.getRepository(Member);
  const legacy = await memberRepo.find({ where: { username: IsNull() } });
  let updated = 0;
  for (const m of legacy) {
    // 存量会员默认账号=手机号，默认密码 123456
    m.username = m.phone;
    m.passwordHash = bcrypt.hashSync('123456', 10);
    await memberRepo.save(m);
    updated += 1;
  }
  console.log(`Backfill member auth done: ${updated} members (username=phone, password=123456)`);
  await ds.destroy();
}

backfillMemberAuth().catch((e) => {
  console.error(e);
  process.exit(1);
});
