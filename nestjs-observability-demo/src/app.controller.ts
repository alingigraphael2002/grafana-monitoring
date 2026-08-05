import {
  Body,
  Controller,
  Get,
  Header,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MetricsService } from './metrics.service';

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);
  private readonly rateLimitWindows = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly metrics: MetricsService) {}

  @Get()
  home() {
    return {
      service: 'nestjs-observability-demo',
      message: 'The demo API is running',
      endpoints: ['/health', '/api/hello', '/api/error', '/api/slow?ms=1000', '/api/timeout', '/api/retry', '/api/rate-limit', '/api/echo', '/metrics'],
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

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async prometheus(@Res() response: Response) {
    response.setHeader('Content-Type', this.metrics.registry.contentType);
    response.send(await this.metrics.render());
  }

  private safeNumber(value: string, fallback: number, maximum: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return Math.min(Math.round(parsed), maximum);
  }
}
