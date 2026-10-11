import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import prisma from "@/lib/db";

// Named look presets (complete themes). Legacy color-only ids are kept so
// older stored profiles still validate; they migrate client-side on load.
const lookSchema = z.enum([
  "sculpt-dark",
  "sculpt-light",
  "mint",
  "phosphor",
  "ledger",
  "ocean-depths",
  "ember",
  "verdant",
  "carbon",
  // legacy
  "violet",
  "ocean",
  "emerald",
  "sunset",
  "rose",
  "mono",
]);

const uiSettingsSchema = z
  .object({
    look: lookSchema,
    // legacy fields, accepted but no longer used (radius is owned by the look)
    colorTheme: lookSchema,
    radius: z.number().min(0).max(2),
    sidebarSide: z.enum(["left", "right"]),
  })
  .partial();

export const settingsRouter = createTRPCRouter({
  getUi: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.auth.user.id },
      select: { uiSettings: true },
    });
    return { uiSettings: (user?.uiSettings as Record<string, unknown>) ?? null };
  }),
  updateUi: protectedProcedure
    .input(uiSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.auth.user.id },
        select: { uiSettings: true },
      });
      const merged = {
        ...((user?.uiSettings as Record<string, unknown>) ?? {}),
        ...input,
      };
      await prisma.user.update({
        where: { id: ctx.auth.user.id },
        data: { uiSettings: merged },
      });
      return merged;
    }),
});

export type SettingsRouter = typeof settingsRouter;
