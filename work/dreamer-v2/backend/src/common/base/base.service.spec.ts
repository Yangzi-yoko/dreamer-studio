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
