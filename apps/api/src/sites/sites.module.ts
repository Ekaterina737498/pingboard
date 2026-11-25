import { Module } from '@nestjs/common';
import { SitesResolver } from './sites.resolver';
import { SitesService } from './sites.service';

@Module({
  providers: [SitesService, SitesResolver],
})
export class SitesModule {}
