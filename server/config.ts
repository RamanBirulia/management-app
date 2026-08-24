import { z } from "zod";
export const config = z.object({ NODE_ENV:z.enum(["development","test","production"]).default("development"), PORT:z.coerce.number().int().positive().default(4000), HOST:z.string().default("0.0.0.0"), DATABASE_URL:z.string().min(1).default("postgres://management:management@localhost:5432/management_log") }).parse(process.env);
