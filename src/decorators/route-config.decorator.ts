import { SetMetadata } from '@nestjs/common';
import { HYPER_EXPRESS_ROUTE_CONFIG_METADATA } from '../constants';

export const RouteConfig = (config: any) =>
  SetMetadata(HYPER_EXPRESS_ROUTE_CONFIG_METADATA, config);