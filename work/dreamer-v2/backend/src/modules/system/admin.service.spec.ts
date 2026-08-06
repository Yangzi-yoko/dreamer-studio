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
