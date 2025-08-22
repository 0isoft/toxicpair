import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth";
import problemRoutes from "./routes/problems";
import meRoutes from "./routes/me";
import attempts from "./routes/attempts";
import swaggerUi from "swagger-ui-express";
import dev from "./routes/dev";

const swaggerJsdoc = require("swagger-jsdoc");

const app = express();

app.use(cors({
  origin: "http://localhost:5173", // frontend origin
  credentials: true,               // allow cookies
}));
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use("/api/me", meRoutes);
app.use("/api/dev", dev);


app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/attempts", attempts);
console.log("Mounted /api/attempts");
console.log("attempts resolves to:", require.resolve("./routes/attempts"));
console.log("DB:", (process.env.DATABASE_URL || "").replace(/:[^:@/]+@/, ":[redacted]@"));


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));

const swaggerSpec = swaggerJsdoc({
    definition: {
      openapi: "3.0.3",
      info: { title: "ToxicPair API", version: "0.1.0" },
      servers: [{ url: "http://localhost:3000" }],
      components: {
        securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
        schemas: {
          Problem: {
            type: "object",
            properties: {
              id: { type: "integer" },
              title: { type: "string" },
              description: { type: "string" },
              difficulty: { type: "string" },
              examples: { type: "object" }
            }
          }
        }
      }
    },
    apis: ["./src/routes/*.ts"], // if you add JSDoc @openapi blocks
  });
  
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));