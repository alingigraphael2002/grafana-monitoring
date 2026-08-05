import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { MetricsService } from './metrics.service';
import { RequestObservabilityMiddleware } from './request-observability.middleware';

@Module({
  controllers: [AppController],
  providers: [MetricsService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestObservabilityMiddleware).forRoutes('*');
  }
}
