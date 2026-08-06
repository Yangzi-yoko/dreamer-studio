import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import configuration from './config/configuration';
import { Studio } from './modules/rental/entities/studio.entity';
import { TimeSlot } from './modules/rental/entities/time-slot.entity';
import { RentalItem } from './modules/rental/entities/rental-item.entity';

async function seedRental(): Promise<void> {
  const db = configuration().database as any;
  const ds = new DataSource({
    type: 'mysql',
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.database,
    entities: [Studio, TimeSlot, RentalItem],
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
  await ds.destroy();
}

seedRental().catch((e) => {
  console.error(e);
  process.exit(1);
});
