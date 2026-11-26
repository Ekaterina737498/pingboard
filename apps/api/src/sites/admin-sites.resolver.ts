import { UseGuards } from '@nestjs/common';
import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminSiteModel } from './admin-site.model';
import { SitesService } from './sites.service';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminSitesResolver {
  constructor(private readonly sitesService: SitesService) {}

  @Query(() => [AdminSiteModel])
  allSites(
    @Args('limit', { type: () => Int, defaultValue: 50 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
  ) {
    return this.sitesService.listAll(limit, offset);
  }
}
