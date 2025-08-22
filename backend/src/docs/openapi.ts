import { OAS3Definition } from "swagger-jsdoc";

export const openapiDocument: OAS3Definition = {
  openapi: "3.0.3",
  info: { title: "ToxicPair API", version: "0.1.0" },
  servers: [{ url: "http://localhost:3000" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Problem: {
        type: "object",
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          description: { type: "string" },
          difficulty: { type: "string" },
          examples: { type: "object", additionalProperties: true, nullable: true },
          tests: { type: "array", items: { type: "object" }, nullable: true },
        },
      },
      UserPublic: {
        type: "object",
        properties: {
          id: { type: "integer" },
          email: { type: "string", format: "email" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      AuthRegisterRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
        },
      },
      AuthLoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
        },
      },
      AuthTokenResponse: {
        type: "object",
        properties: { accessToken: { type: "string" } },
      },
      ErrorResponse: {
        type: "object",
        properties: { error: { type: "string" } },
      },
    },
  },
  tags: [
    { name: "Auth" }, { name: "Me" }, { name: "Problems" }, { name: "Health" }
  ],
  paths: {
    "/api/health": {
      get: { tags: ["Health"], summary: "Healthcheck", responses: { 200: { description: "OK" } } }
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Create account",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/AuthRegisterRequest" } } }
        },
        responses: {
          201: { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthTokenResponse" } } } },
          400: { description: "Invalid payload", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          409: { description: "Email already in use", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/AuthLoginRequest" } } }
        },
        responses: {
          200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthTokenResponse" } } } },
          400: { description: "Invalid payload" }, 401: { description: "Invalid credentials" }
        }
      }
    },
    "/api/auth/refresh": {
      post: {
        tags: ["Auth"], summary: "Rotate access token",
        responses: {
          200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthTokenResponse" } } } },
          401: { description: "Missing/invalid refresh token" }
        }
      }
    },
    "/api/me": {
      get: {
        tags: ["Me"], summary: "Current user", security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/UserPublic" } } } },
          401: { description: "Unauthorized" }
        }
      }
    },
    "/api/problems": {
      get: {
        tags: ["Problems"], summary: "List problems",
        responses: {
          200: {
            description: "OK",
            content: { "application/json": {
              schema: { type: "array", items: { type: "object", properties: {
                id: { type: "integer" }, title: { type: "string" }, difficulty: { type: "string" }
              }}}
            }}
          }
        }
      }
    },
    "/api/problems/{id}": {
      get: {
        tags: ["Problems"], summary: "Get problem by id",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Problem" } } } },
          400: { description: "Invalid id" }, 404: { description: "Not found" }
        }
      }
    }
  }
};
