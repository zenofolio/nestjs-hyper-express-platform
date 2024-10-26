import { SetMetadata } from '@nestjs/common/decorators/core/set-metadata.decorator';
import { HYPER_EXPRESS_ROUTE_CONFIG_METADATA } from '../constants';

export const RouteConfig = (config: unknown) =>
  SetMetadata(HYPER_EXPRESS_ROUTE_CONFIG_METADATA, config);