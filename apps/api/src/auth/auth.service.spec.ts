import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { AuthService } from './auth.service';

jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    user: { findUnique: jest.fn(), create: jest.fn() },
  };
  const jwtMock = { signAsync: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('stores a hashed password, not the plain one', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({ id: '1' });

      await service.register({ email: 'a@b.com', password: 'abc12345' });

      const data = prismaMock.user.create.mock.calls[0][0].data;
      expect(data.email).toBe('a@b.com');
      expect(data.passwordHash).not.toBe('abc12345');
      expect(await bcrypt.compare('abc12345', data.passwordHash)).toBe(true);
    });

    it('rejects an email that is already registered', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: '1' });

      await expect(
        service.register({ email: 'a@b.com', password: 'abc12345' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const makeUser = async (overrides = {}) => ({
      id: '1',
      role: 'USER',
      isBlocked: false,
      passwordHash: await bcrypt.hash('abc12345', 4),
      ...overrides,
    });

    it('returns an access token for valid credentials', async () => {
      prismaMock.user.findUnique.mockResolvedValue(await makeUser());
      jwtMock.signAsync.mockResolvedValue('signed-token');

      const result = await service.login({
        email: 'a@b.com',
        password: 'abc12345',
      });

      expect(result).toEqual({ accessToken: 'signed-token' });
      expect(jwtMock.signAsync).toHaveBeenCalledWith({
        sub: '1',
        role: 'USER',
      });
    });

    it('rejects a wrong password', async () => {
      prismaMock.user.findUnique.mockResolvedValue(await makeUser());

      await expect(
        service.login({ email: 'a@b.com', password: 'wrong12345' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an unknown email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@b.com', password: 'abc12345' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a blocked user even with the right password', async () => {
      prismaMock.user.findUnique.mockResolvedValue(
        await makeUser({ isBlocked: true }),
      );

      await expect(
        service.login({ email: 'a@b.com', password: 'abc12345' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
