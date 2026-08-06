import { AdminService } from './admin.service';
import { BusinessException } from '../../common/exceptions/business.exception';

describe('AdminService', () => {
  const repo: any = {
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    findBy: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
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

  it('page excludes passwordHash from listed admins', async () => {
    repo.findAndCount.mockResolvedValue([
      [{ id: 1, username: 'a', passwordHash: 'hash-1', nickname: 'A', isSuper: false, status: 1, roles: [] }],
      1,
    ]);
    const result = await service.page(1, 10);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.list[0]).not.toHaveProperty('passwordHash');
  });

  it('createAdmin returns admin without passwordHash', async () => {
    const saved = {
      id: 1,
      username: 'b',
      passwordHash: 'hash-2',
      nickname: 'B',
      isSuper: false,
      status: 1,
      roles: [],
    };
    roleRepo.findBy.mockResolvedValue([]);
    repo.findOneBy.mockResolvedValue(undefined);
    repo.create.mockReturnValue(saved);
    repo.save.mockResolvedValue(saved);
    const result = await service.createAdmin(
      { isSuper: true },
      { username: 'b', password: 'secret', nickname: 'B' } as any,
    );
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.username).toBe('b');
  });
});
