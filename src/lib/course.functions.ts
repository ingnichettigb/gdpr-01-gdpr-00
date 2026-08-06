import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
  ActiveLicenseResult,
  CourseModulesResult,
  CourseProgressResult,
  MarkModuleResult,
  SaveTestResultResult,
} from "@/lib/course.types";

/** Moduli del corso di questa app (risolto da APP_CODE), ordinati per order_index. */
export const getCourseModules = createServerFn({ method: "POST" }).handler(
  async (): Promise<CourseModulesResult> => {
    try {
      const { fetchCourseModules } = await import("@/lib/course.server");
      return await fetchCourseModules();
    } catch (err) {
      console.error("getCourseModules exception", err);
      return { courseId: null, modules: [] };
    }
  },
);

const userSchema = z.object({ userId: z.string().uuid() });

/** Avanzamento dell'utente sui moduli del corso. */
export const getCourseProgress = createServerFn({ method: "POST" })
  .validator(userSchema)
  .handler(async ({ data }): Promise<CourseProgressResult> => {
    try {
      const { fetchCourseProgress } = await import("@/lib/course.server");
      return await fetchCourseProgress(data.userId);
    } catch (err) {
      console.error("getCourseProgress exception", err);
      return { courseId: null, completedModuleIds: [], courseCompleted: false };
    }
  });

const markSchema = z.object({
  userId: z.string().uuid(),
  moduleId: z.string().uuid(),
});

/** Segna un modulo come completato; se tutti completati aggiorna course_completed. */
export const markModuleCompleted = createServerFn({ method: "POST" })
  .validator(markSchema)
  .handler(async ({ data }): Promise<MarkModuleResult> => {
    try {
      const { completeModule } = await import("@/lib/course.server");
      return await completeModule(data.userId, data.moduleId);
    } catch (err) {
      console.error("markModuleCompleted exception", err);
      return { ok: false, allCompleted: false, error: "server_error" };
    }
  });

const testSchema = z.object({
  userId: z.string().uuid(),
  score: z.number().int().min(0),
  passed: z.boolean(),
});

/** Registra l'esito del test finale in course_tests. */
export const saveTestResult = createServerFn({ method: "POST" })
  .validator(testSchema)
  .handler(async ({ data }): Promise<SaveTestResultResult> => {
    try {
      const { insertTestResult } = await import("@/lib/course.server");
      return await insertTestResult(data.userId, data.score, data.passed);
    } catch (err) {
      console.error("saveTestResult exception", err);
      return { ok: false, error: "server_error" };
    }
  });

const emailSchema = z.object({ email: z.string().email().max(255) });

/** Esiste una licenza attiva per questa email (app corrente)? */
export const findActiveLicenseByEmail = createServerFn({ method: "POST" })
  .validator(emailSchema)
  .handler(async ({ data }): Promise<ActiveLicenseResult> => {
    try {
      const { findActiveLicense } = await import("@/lib/course.server");
      return await findActiveLicense(data.email.trim().toLowerCase());
    } catch (err) {
      console.error("findActiveLicenseByEmail exception", err);
      return { found: false, licenseId: null, licenseKey: null, puk: null };
    }
  });
