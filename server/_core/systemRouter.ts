import { z } from "zod";
import { adminProcedure, engineerProcedure, publicProcedure, router, viewerProcedure } from "./trpc";
import * as db from "../db";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  demoData: viewerProcedure.query(async () => ({ enabled: await db.refreshDemoDataSetting() })),

  setDemoData: engineerProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      // The toggle is an explicit engineering opt-in, so it may add isolated,
      // clearly marked demo records without replacing connected equipment.
      if (input.enabled) await db.initializeDemoScenario({ allowAlongsideLive: true });
      return { enabled: await db.setDemoDataSetting(input.enabled, ctx.user.id) };
    }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      console.log("[System] notifyOwner called:", input);
      return {
        success: true,
      } as const;
    }),
});
