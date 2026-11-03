// The Prisma client. One instance per server process; in development it is kept on globalThis so
// hot reloads don't open a new connection pool on every edit.
//
// Server-only. Pages never import this directly: they call the read functions in
// src/lib/data/* (cached, shaped for pages) and mutations go through Server Actions.

import "server-only";

import { PrismaClient, type Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { __healthGurgaonPrisma?: PrismaClient };

export const db: PrismaClient =
  globalForPrisma.__healthGurgaonPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.__healthGurgaonPrisma = db;

export type Db = PrismaClient;
/** The client or an interactive-transaction client: helpers that write accept either. */
export type DbClient = Prisma.TransactionClient;
