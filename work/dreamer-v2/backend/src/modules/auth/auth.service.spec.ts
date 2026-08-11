import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { BusinessException } from '../../common/exceptions/business.exception';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  const repo: any = {
    findOneBy: jest.fn(),
  };
  const jwt: any = { sign: jest.fn(() => 'token-abc') };
  const throttle: any = { assertAllowed: jest.fn(async () => {}), onSuccess: jest.fn(), onFailure: jest.fn() };
  const service = new AuthService(repo, jwt, throttle);

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
