import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // DATABASE_POOL_MAX=1 untuk `prisma dev` lokal (PGlite hanya melayani satu koneksi).
  const max = Number(process.env.DATABASE_POOL_MAX ?? 10);
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL!, max });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
