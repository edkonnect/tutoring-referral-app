import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import { sdk } from "./sdk";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    const cookieHeader = opts.req.headers.cookie;
    const cookies = cookieHeader ? parseCookieHeader(cookieHeader) : {};
    const sessionCookie = cookies[COOKIE_NAME];
    const session = await sdk.verifySession(sessionCookie);
    if (session?.openId) {
      user = await db.getUserByOpenId(session.openId);
    }
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
