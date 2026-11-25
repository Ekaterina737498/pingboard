import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { LastCheckCache } from '../redis/last-check.cache';
import { LastCheckModel } from './last-check.model';
import { SiteModel } from './site.model';

@Resolver(() => SiteModel)
export class SiteFieldsResolver {
  constructor(private readonly cache: LastCheckCache) {}

  @ResolveField(() => LastCheckModel, { nullable: true })
  lastCheck(@Parent() site: SiteModel) {
    return this.cache.get(site.id);
  }
}
