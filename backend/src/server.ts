import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth";
import personasRouter from "./routes/personas";
import problemRoutes from "./routes/problems";
import meRoutes from "./routes/me";
import attempts from "./routes/attempts";
import swaggerUi from "swagger-ui-express";
import dev from "./routes/dev";
import aiRoutes from "./routes/ai";
import progressRouter from "./routes/progress";
import sessionsRoutes from "./routes/sessions"; // ⬅️ add this
import adminRouter from "./admin";



import { decodeAuth, requireAuth } from "./middleware/requireAuth";
const swaggerJsdoc = require("swagger-jsdoc");


const app = express();

//app.use(cors({
//  origin: "http://localhost:5173", // frontend origin
//  credentials: true,               // allow cookies
//}));

const allowed = (process.env.CORS_ORIGINS ?? process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    // allow same-origin or tools without an Origin (curl/health checks)
    if (!origin) return cb(null, true);
    if (allowed.includes(origin)) return cb(null, true);
    return cb(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));
app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(decodeAuth);  
app.use("/api/me", meRoutes);
app.use("/api/dev", dev);


app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/attempts", attempts);
console.log("Mounted /api/attempts");
app.use("/api/sessions", sessionsRoutes);

console.log("attempts resolves to:", require.resolve("./routes/attempts"));
console.log("DB:", (process.env.DATABASE_URL || "").replace(/:[^:@/]+@/, ":[redacted]@"));

app.use("/api/ai", aiRoutes);
app.use("/api", personasRouter);
app.use("/api/progress", progressRouter);
app.use("/api/admin", adminRouter);


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
  
  