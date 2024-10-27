import compression from '@fastify/compress';
import { NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ErrorFilter } from './filters/ExceptionFilter';
import { ResponseBodyInterceptor } from './interceptors/ResponseBodyInterceptor';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ValidationFailed } from './types/errors/types';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
    const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

    // We use fastify which is not directly compatiable with passport
    // Therefore we need to add this "polyfill"
    app.getHttpAdapter()
        .getInstance()
        .addHook('onRequest', (request: any, reply: any, done) => {
            reply.setHeader = function (key: any, value: any) {
                return this.raw.setHeader(key, value);
            };
            reply.end = function () {
                this.raw.end();
            };
            request.res = reply;
            done();
        });
    app.enableCors({
        origin: ['*']
    });
    app.useGlobalPipes(
        new ValidationPipe({
            exceptionFactory: (errors) => {
                return new ValidationFailed(errors);
            },
            stopAtFirstError: true
        })
    );
    app.useGlobalFilters(new ErrorFilter());
    app.useGlobalInterceptors(new ResponseBodyInterceptor());
    app.useGlobalInterceptors(
        new ClassSerializerInterceptor(app.get(Reflector), { excludeExtraneousValues: true })
    );
    const config = new DocumentBuilder()
        .setTitle('API Documentation')
        .setDescription('')
        .setVersion('1.0')
        .addTag('')
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api_doc', app, document);
    await app.register(compression, { encodings: ['gzip', 'deflate'] });
    await app.listen(process.env.PORT!, '0.0.0.0');
}
bootstrap();
