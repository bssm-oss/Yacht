import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: 'https://web-yacht-front-moi1ut3j59ddc723.sel3.cloudtype.app',
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3001);
  console.log(`Backend running on port ${process.env.PORT ?? 3001}`);
}
bootstrap();
