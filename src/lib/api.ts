import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { OrderError } from "./orders";

export const ok = (data: unknown, init?: number) => NextResponse.json(data, { status: init ?? 200 });
export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export function handle<T extends unknown[]>(fn: (...args: T) => Promise<Response>) {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof OrderError) return fail(e.message, 400);
      if (e instanceof ZodError) return fail(e.issues[0]?.message ?? "Invalid request", 400);
      console.error(e);
      return fail("Something went wrong. Please try again.", 500);
    }
  };
}
