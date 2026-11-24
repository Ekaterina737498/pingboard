import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AddSiteInput } from './add-site.input';

export const MAX_SITES_PER_USER = 10;

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  async add(ownerId: string, input: AddSiteInput) {
    const count = await this.prisma.site.count({ where: { ownerId } });
    if (count >= MAX_SITES_PER_USER) {
      throw new BadRequestException(
        `You can monitor up to ${MAX_SITES_PER_USER} sites`,
      );
    }
    return this.prisma.site.create({
      data: { ownerId, name: input.name, url: input.url },
    });
  }

  list(ownerId: string) {
    return this.prisma.site.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(ownerId: string, id: string) {
    const site = await this.prisma.site.findFirst({ where: { id, ownerId } });
    if (!site) {
      throw new NotFoundException('Site not found');
    }
    return site;
  }

  async remove(ownerId: string, id: string) {
    await this.get(ownerId, id);
    return this.prisma.site.delete({ where: { id } });
  }
}