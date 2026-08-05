import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  HttpCode,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Param,
  Post,
  Query,
  Req,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MetricsService } from './metrics.service';
import {
  dependencyNames,
  DependencyName,
  TelemetryService,
} from './telemetry.service';
import { currentTraceContext } from './telemetry-log';

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const dependencyOperations: Record<DependencyName, string> = {
  postgresql_citus: 'database_query',
  kafka: 'publish_event',
  external_api: 'payment_request',
  redis_cache: 'cache_operation',
  file_storage: 'store_receipt',
  auth_provider: 'validate_token',
};

const kafkaOperations = new Set(['publish_event', 'consume_event']);

interface CheckoutRequest {
  order_id?: string;
  amount?: number;
  items?: number;
  channel?: string;
  fail_at?: string;
}

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);
  private readonly rateLimitWindows = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly metrics: MetricsService,
    private readonly telemetry: TelemetryService,
  ) {}

  @Get()
  home() {
    return {
      service: 'nestjs-observability-demo',
      message: 'The demo API is running',
      endpoints: ['/health', '/api/hello', '/api/error', '/api/slow?ms=1000', '/api/timeout', '/api/retry', '/api/rate-limit', '/api/echo', '/metrics'],
      telemetry_endpoints: [
        '/api/dependencies/:dependency',
        '/api/dependencies/kafka?operation=publish_event|consume_event',
        '/api/checkout',
      ],
      simulated_dependencies: dependencyNames,
      checkout_fail_at: [
        'api_gateway',
        'auth_provider',
        'authorization',
        'application_logic',
        'postgresql_citus',
        'redis_cache',
        'kafka',
        'kafka_publish',
        'kafka_consume',
        'external_api',
        'file_storage',
      ],
    };
  }

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('api/hello')
  hello(@Query('name') name = 'beginner') {
    this.logger.log(`Hello endpoint called for ${name}`);
    return { message: `Hello, ${name}!` };
  }

  @Get('api/error')
  error(): never {
    this.logger.error('A test error was intentionally generated');
    throw new InternalServerErrorException('Intentional test error');
  }

  @Get('api/slow')
  async slow(@Query('ms') milliseconds = '1000') {
    const delay = this.safeNumber(milliseconds, 1_000, 10_000);
    this.logger.warn(`Simulating a slow request lasting ${delay}ms`);
    await sleep(delay);
    return { message: 'Slow request completed', delay_ms: delay };
  }

  @Get('api/timeout')
  async timeout() {
    this.metrics.timeouts.inc({ route: '/api/timeout' });
    this.logger.warn('Simulating an upstream timeout');
    await sleep(500);
    throw new HttpException('Simulated upstream timeout', HttpStatus.GATEWAY_TIMEOUT);
  }

  @Get('api/retry')
  async retry(@Query('failures') failuresValue = '2') {
    const failures = this.safeNumber(failuresValue, 2, 5);
    for (let attempt = 1; attempt <= failures; attempt += 1) {
      this.metrics.retries.inc({ operation: 'demo_upstream_call' });
      this.logger.warn(`Upstream attempt ${attempt} failed; retrying`);
      await sleep(100);
    }
    return { message: 'Operation succeeded after retries', retries: failures };
  }

  @Get('api/rate-limit')
  rateLimit(@Req() req: Request) {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const current = this.rateLimitWindows.get(key);
    const window = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + 60_000 }
      : current;
    window.count += 1;
    this.rateLimitWindows.set(key, window);

    if (window.count > 5) {
      this.metrics.rateLimitHits.inc({ route: '/api/rate-limit' });
      this.logger.warn(`Rate limit rejected client ${key}`);
      throw new HttpException('Too many requests; wait one minute', HttpStatus.TOO_MANY_REQUESTS);
    }

    return { message: 'Request accepted', remaining: 5 - window.count };
  }

  @Post('api/echo')
  echo(@Body() body: unknown) {
    return { received: body };
  }

  @Get('api/dependencies/:dependency')
  async dependency(
    @Param('dependency') dependencyValue: string,
    @Query('fail') failValue = 'false',
    @Query('operation') operationValue?: string,
  ) {
    if (!dependencyNames.includes(dependencyValue as DependencyName)) {
      throw new BadRequestException(
        `Unknown dependency. Use one of: ${dependencyNames.join(', ')}`,
      );
    }

    const dependency = dependencyValue as DependencyName;
    const operation = this.resolveDependencyOperation(dependency, operationValue);
    const shouldFail = failValue.toLowerCase() === 'true';
    try {
      await this.telemetry.runDependency(
        dependency,
        operation,
        this.dependencyDelay(dependency, operation),
        shouldFail,
      );
    } catch {
      throw new ServiceUnavailableException(`Simulated ${dependency} failure`);
    }

    return {
      dependency,
      operation,
      outcome: 'success',
      simulated: true,
      ...currentTraceContext(),
    };
  }

  @Post('api/checkout')
  @HttpCode(HttpStatus.CREATED)
  async checkout(@Body() body: CheckoutRequest, @Req() req: Request) {
    const orderId = body.order_id ?? crypto.randomUUID();
    const amount = this.safeNumber(String(body.amount ?? 99.99), 99.99, 1_000_000);
    const items = Math.max(1, this.safeNumber(String(body.items ?? 1), 1, 100));
    const channel = body.channel ?? 'api';
    const failAt = (body.fail_at ?? '').toLowerCase();
    const role = String(req.headers['x-demo-role'] ?? 'customer').toLowerCase();

    try {
      await this.telemetry.runInternalStage('api_gateway', 'route_request', 10, failAt === 'api_gateway');
      await this.telemetry.runDependency('auth_provider', 'validate_token', 25, failAt === 'auth_provider');
      await this.telemetry.runInternalStage(
        'authorization',
        'authorize_checkout',
        8,
        role === 'denied' || failAt === 'authorization',
      );
      await this.telemetry.runInternalStage(
        'application_logic',
        'validate_order',
        15,
        failAt === 'application_logic',
      );
      await this.telemetry.runDependency(
        'postgresql_citus',
        'database_query',
        70,
        failAt === 'postgresql_citus',
      );
      await this.telemetry.runDependency('redis_cache', 'cache_operation', 12, failAt === 'redis_cache');
      await this.telemetry.runDependency(
        'kafka',
        'publish_event',
        35,
        failAt === 'kafka' || failAt === 'kafka_publish',
      );
      await this.telemetry.runDependency(
        'kafka',
        'consume_event',
        40,
        failAt === 'kafka_consume',
      );
      await this.telemetry.runDependency('external_api', 'payment_request', 120, failAt === 'external_api');
      await this.telemetry.runDependency('file_storage', 'store_receipt', 45, failAt === 'file_storage');

      this.telemetry.recordBusinessTransaction({
        transaction: 'checkout',
        outcome: 'success',
        channel,
        amount,
        items,
        orderId,
      });

      return {
        order_id: orderId,
        status: 'completed',
        amount,
        items,
        channel,
        simulated: true,
        ...currentTraceContext(),
      };
    } catch (error) {
      this.telemetry.recordBusinessTransaction({
        transaction: 'checkout',
        outcome: 'failure',
        channel,
        amount,
        items,
        orderId,
      });

      if (role === 'denied' || failAt === 'authorization') {
        throw new ForbiddenException('Simulated authorization failure');
      }
      const message = error instanceof Error ? error.message : 'Simulated checkout failure';
      throw new ServiceUnavailableException(message);
    }
  }

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async prometheus(@Res() response: Response) {
    response.setHeader('Content-Type', this.metrics.registry.contentType);
    response.send(await this.metrics.render());
  }

  private resolveDependencyOperation(
    dependency: DependencyName,
    operationValue?: string,
  ): string {
    if (!operationValue) {
      return dependencyOperations[dependency];
    }

    if (dependency === 'kafka' && kafkaOperations.has(operationValue)) {
      return operationValue;
    }

    if (operationValue === dependencyOperations[dependency]) {
      return operationValue;
    }

    throw new BadRequestException(
      dependency === 'kafka'
        ? 'Kafka operation must be publish_event or consume_event'
        : `Unsupported operation for ${dependency}`,
    );
  }

  private dependencyDelay(dependency: DependencyName, operation?: string): number {
    if (dependency === 'kafka' && operation === 'consume_event') {
      return 40;
    }

    const delays: Record<DependencyName, number> = {
      postgresql_citus: 70,
      kafka: 35,
      external_api: 120,
      redis_cache: 12,
      file_storage: 45,
      auth_provider: 25,
    };
    return delays[dependency];
  }

  private safeNumber(value: string, fallback: number, maximum: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return Math.min(Math.round(parsed), maximum);
  }
}
