"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./auth/auth.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const prisma_module_1 = require("./prisma/prisma.module");
const prisma_service_1 = require("./prisma/prisma.service");
const user_module_1 = require("./user/user.module");
const publishers_module_1 = require("./publishers/publishers.module");
const comapaings_module_1 = require("./comapaings/comapaings.module");
const categories_module_1 = require("./categories/categories.module");
const products_module_1 = require("./products/products.module");
const chat_module_1 = require("./chat/chat.module");
const media_module_1 = require("./media/media.module");
const documents_module_1 = require("./documents/documents.module");
const serve_static_1 = require("@nestjs/serve-static");
const path_1 = require("path");
const files_controller_1 = require("./files/files.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(__dirname, '..', 'static'),
                serveRoot: '/',
            }),
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(__dirname, '..', 'static'),
                serveRoot: '/publishers',
            }),
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(__dirname, '..', 'static'),
                serveRoot: '/open-source',
            }),
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(__dirname, '..', 'static'),
                serveRoot: '/ecommerce',
            }),
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(__dirname, '..', 'static'),
                serveRoot: '/performance',
            }),
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(__dirname, '..', 'static'),
                serveRoot: '/compaign',
            }),
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(__dirname, '..', 'static'),
                serveRoot: '/select-compaign',
            }),
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(__dirname, '..', 'static'),
                serveRoot: '/financials',
            }),
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(__dirname, '..', 'static'),
                serveRoot: '/chat',
            }),
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(__dirname, '..', 'static'),
                serveRoot: '/chat-configuration',
            }),
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(__dirname, '..', 'uploads'),
                serveRoot: '/uploads/documents',
            }),
            auth_module_1.AuthModule,
            dashboard_module_1.DashboardModule,
            prisma_module_1.PrismaModule,
            publishers_module_1.PublishersModule,
            user_module_1.UserModule,
            comapaings_module_1.ComapaingsModule,
            categories_module_1.CategoriesModule,
            products_module_1.ProductsModule,
            chat_module_1.ChatModule,
            media_module_1.MediaModule,
            documents_module_1.DocumentsModule,
        ],
        controllers: [app_controller_1.AppController, files_controller_1.FilesController],
        providers: [app_service_1.AppService, prisma_service_1.PrismaService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map