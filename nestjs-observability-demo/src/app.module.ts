import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { MetricsService } from './metrics.service';
import { RequestObservabilityMiddleware } from './request-observability.middleware';
import { TelemetryService } from './telemetry.service';

@Module({
  controllers: [AppController],
  providers: [MetricsService, TelemetryService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestObservabilityMiddleware).forRoutes('*');
  }
}
