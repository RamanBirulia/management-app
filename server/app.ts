import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { checkDatabase } from "./db.js";
export function buildApp(databaseCheck=checkDatabase){ const app=Fastify({logger:true,trustProxy:true}); app.register(rateLimit,{max:120,timeWindow:"1 minute"}); app.get("/health/live",async()=>({status:"ok"})); app.get("/health/ready",async(_request,reply)=>{try{await databaseCheck();return {status:"ready",database:"up"};}catch{return reply.code(503).send({status:"not-ready",database:"down"});}}); app.get("/api/meta",async()=>({service:"management-log-api",stage:0,authentication:"disabled-for-test-data",timezone:"Europe/Tallinn"})); return app; }
