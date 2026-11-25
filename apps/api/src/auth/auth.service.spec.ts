import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { AuthService } from './auth.service';

jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  };
  const jwtMock = { signAsync: jest.fn(), verifyAsync: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => 'refresh-secret' },
        },
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

    it('returns both tokens and stores the refresh token hash', async () => {
      prismaMock.user.findUnique.mockResolvedValue(await makeUser());
      jwtMock.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login({
        email: 'a@b.com',
        password: 'abc12345',
      });

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(jwtMock.signAsync).toHaveBeenNthCalledWith(1, {
        sub: '1',
        role: 'USER',
      });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { refreshTokenHash: sha256('refresh-token') },
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

  describe('refresh', () => {
    const makeUser = (overrides = {}) => ({
      id: '1',
      role: 'USER',
      isBlocked: false,
      refreshTokenHash: sha256('old-refresh'),
      ...overrides,
    });

    it('rotates the refresh token', async () => {
      jwtMock.verifyAsync.mockResolvedValue({ sub: '1' });
      prismaMock.user.findUnique.mockResolvedValue(makeUser());
      jwtMock.signAsync
        .mockResolvedValueOnce('new-access')
        .mockResolvedValueOnce('new-refresh');

      const result = await service.refresh('old-refresh');

      expect(result).toEqual({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { refreshTokenHash: sha256('new-refresh') },
      });
    });

    it('rejects a missing token', async () => {
      await expect(service.refresh(undefined)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a token with a bad signature', async () => {
      jwtMock.verifyAsync.mockRejectedValue(new Error('invalid signature'));

      await expect(service.refresh('forged')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('revokes the session when an old token is reused', async () => {
      jwtMock.verifyAsync.mockResolvedValue({ sub: '1' });
      prismaMock.user.findUnique.mockResolvedValue(makeUser());

      await expect(service.refresh('stolen-old')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { refreshTokenHash: null },
      });
    });

    it('rejects a blocked user', async () => {
      jwtMock.verifyAsync.mockResolvedValue({ sub: '1' });
      prismaMock.user.findUnique.mockResolvedValue(
        makeUser({ isBlocked: true }),
      );

      await expect(service.refresh('old-refresh')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('clears the stored refresh token hash', async () => {
      jwtMock.verifyAsync.mockResolvedValue({ sub: '1' });

      await service.logout('some-refresh');

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { refreshTokenHash: null },
      });
    });

    it('does not throw for an invalid token', async () => {
      jwtMock.verifyAsync.mockRejectedValue(new Error('invalid'));

      await expect(service.logout('garbage')).resolves.toBeUndefined();
    });
  });
});
