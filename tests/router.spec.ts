import { strictEqual } from 'node:assert';
import { describe } from 'mocha';
import { RouteConfig } from '../src/decorators/route-config.decorator';
import { HYPER_EXPRESS_ROUTE_CONFIG_METADATA } from '../src/constants';

describe('@RouteConfig', () => {

  const routeConfig = { testKey: 'testValue' };
  class Test {
    config: any;
    // @ts-ignore
    @RouteConfig(routeConfig)
    public static test() {}
  }


  it('should enhance method with expected route config', () => {
    const path = Reflect.getMetadata(HYPER_EXPRESS_ROUTE_CONFIG_METADATA, Test.test);
    strictEqual(path, routeConfig);
  })
 
 
});