import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Application } from "express";
import dotenv from "dotenv";

dotenv.config();

const options: swaggerJSDoc.Options = {
    definition: {
        openapi: "3.0.0",

        info: {
            title: "HRMS (Human Resource Management System)",
            version: "1.0.0",
            description:
                "REST API documentation for the HRMS (Human Resource Management System) App.",
            contact: {
                name: "Muskan Mujavar",
                email: "atisnodejsdeveloper@example.com",
            },
            license: {
                name: "MIT",
            },
        },

        servers: [
            {
                url: process.env.SWAGGER_SERVER_URL || "http://localhost:5000",
                description: "Development Server",
            },
        ],

        security: [
            {
                bearerAuth: [],
            },
        ],

        tags: [
            {
                name: "Authentication - Admin Login",
                description: "Admin and super-admin login.",
            },
            {
                name: "Authentication - Employee Login",
                description: "Employee login using Employee ID and password.",
            },
            {
                name: "Organization",
                description: "Organization management (super-admin writes, admin and super-admin reads).",
            },
            {
                name: "Employee",
                description: "Employee management (admin and super-admin).",
            },
            {
                name: "Leaves",
                description: "Leave management for employees, admins and super-admins.",
            },
            {
                name: "HRMS - On Boarding",
                description:
                    "APIs for managing onboarding screens in the HRMS application.",
            },
        ],

        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
    },

    apis: [
        "./src/app/modules/**/*.controller.ts",
        "./src/app/modules/**/*.routes.ts",
        "./src/app/modules/**/*.model.ts",
        "./src/app/routes/index.ts",
        "./src/**/*.ts",
    ],
};

const CSS_URL =
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css";

const JS_BUNDLE_URL =
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.min.js";

const JS_PRESET_URL =
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.min.js";

export const setupSwagger = (app: Application): void => {
    const specs = swaggerJSDoc(options);

    app.use(
        "/api-docs",
        swaggerUi.serveFiles(specs, {}),
        swaggerUi.setup(specs, {
            explorer: true,
            customCssUrl: CSS_URL,
            customJs: [JS_BUNDLE_URL, JS_PRESET_URL],
        })
    );

    console.log(
        "📚 Swagger documentation available at: http://localhost:5000/api-docs"
    );
};
