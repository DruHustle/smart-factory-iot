import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    if (process.env.NODE_ENV === "production" && error.code === "INTERNAL_SERVER_ERROR") {
      // Database/SDK errors can contain SQL parameters and implementation details.
      return { ...shape, message: "The request could not be completed. Please try again shortly.", data: { ...shape.data, stack: undefined } };
    }
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

const roleRank: Record<string, number> = {
  user: 0, // Legacy accounts have viewer permissions.
  viewer: 0,
  operator: 1,
  engineer: 2,
  admin: 3,
};

function requireMinimumRole(minimumRole: "viewer" | "operator" | "engineer" | "admin") {
  return protectedProcedure.use(t.middleware(({ ctx, next }) => {
    if (!ctx.user || (roleRank[ctx.user.role] ?? -1) < roleRank[minimumRole]) {
      throw new TRPCError({ code: "FORBIDDEN", message: `Requires ${minimumRole} access` });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  }));
}

export const viewerProcedure = requireMinimumRole("viewer");
export const operatorProcedure = requireMinimumRole("operator");
export const engineerProcedure = requireMinimumRole("engineer");

export const adminProcedure = protectedProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
