/**
 * Helper server-only per le tabelle corso del database ESTERNO
 * (courses, course_modules, course_progress, course_tests).
 *
 * Regola architetturale: il course_id viene SEMPRE risolto a partire da
 * APP_CODE (@/lib/app-config) — mai da puk_codes.course_id ne' da UUID
 * hardcoded nei componenti. Questo file e' l'unico punto di mappatura
 * app_code -> course_id.
 */
import { supabaseExternal } from "@/integrations/supabase/client.external";
import { APP_CODE, COURSE_ID_BY_APP_CODE } from "@/lib/app-config";
import type {
  ActiveLicenseResult,
  CourseModulesResult,
  CourseProgressResult,
  MarkModuleResult,
  SaveTestResultResult,
} from "@/lib/course.types";

/** Risolve il course_id del corso gestito da questa app. */
export async function resolveCourseId(): Promise<string | null> {
  // 1. Preferenza: colonna app_code su courses
  try {
    const { data, error } = await supabaseExternal
      .from("courses")
      .select("id")
      .eq("app_code", APP_CODE)
      .limit(1)
      .maybeSingle();
    if (!error && data?.id) return data.id as string;
    if (error) console.error("resolveCourseId: courses.app_code lookup", error);
  } catch (err) {
    console.error("resolveCourseId exception", err);
  }

  // 2. Fallback: mappatura statica in codice
  const mapped = COURSE_ID_BY_APP_CODE[APP_CODE];
  if (mapped) return mapped;

  // 3. Ultimo fallback: setup mono-corso
  try {
    const { data } = await supabaseExternal
      .from("courses")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return (data?.id as string | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function fetchCourseModules(): Promise<CourseModulesResult> {
  const courseId = await resolveCourseId();
  if (!courseId) return { courseId: null, modules: [] };

  const { data, error } = await supabaseExternal
    .from("course_modules")
    .select("id, title, youtube_url, order_index, duration_seconds")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("fetchCourseModules error", error);
    return { courseId, modules: [] };
  }

  return {
    courseId,
    modules: (data ?? []).map((m) => ({
      id: m.id as string,
      title: (m.title as string | null) ?? "",
      youtube_url: (m.youtube_url as string | null) ?? null,
      order_index: (m.order_index as number | null) ?? 0,
      duration_seconds: (m.duration_seconds as number | null) ?? null,
    })),
  };
}

async function moduleIdsForCourse(courseId: string): Promise<string[]> {
  const { data, error } = await supabaseExternal
    .from("course_modules")
    .select("id")
    .eq("course_id", courseId);
  if (error) {
    console.error("moduleIdsForCourse error", error);
    return [];
  }
  return (data ?? []).map((m) => m.id as string);
}

export async function fetchCourseProgress(
  userId: string,
): Promise<CourseProgressResult> {
  const courseId = await resolveCourseId();
  if (!courseId) {
    return { courseId: null, completedModuleIds: [], courseCompleted: false };
  }

  const moduleIds = await moduleIdsForCourse(courseId);
  if (moduleIds.length === 0) {
    return { courseId, completedModuleIds: [], courseCompleted: false };
  }

  const { data, error } = await supabaseExternal
    .from("course_progress")
    .select("module_id, status, course_completed")
    .eq("user_id", userId)
    .in("module_id", moduleIds);

  if (error) {
    console.error("fetchCourseProgress error", error);
    return { courseId, completedModuleIds: [], courseCompleted: false };
  }

  const rows = data ?? [];
  const completedModuleIds = rows
    .filter((r) => r.status === "completed")
    .map((r) => r.module_id as string);

  return {
    courseId,
    completedModuleIds,
    courseCompleted:
      rows.some((r) => r.course_completed === true) ||
      (completedModuleIds.length > 0 &&
        completedModuleIds.length === moduleIds.length),
  };
}

export async function completeModule(
  userId: string,
  moduleId: string,
): Promise<MarkModuleResult> {
  const nowIso = new Date().toISOString();

  // Upsert manuale: la tabella potrebbe non avere un unique (user_id, module_id).
  const { data: existing, error: selErr } = await supabaseExternal
    .from("course_progress")
    .select("id")
    .eq("user_id", userId)
    .eq("module_id", moduleId)
    .limit(1)
    .maybeSingle();

  if (selErr) {
    console.error("completeModule select error", selErr);
    return { ok: false, allCompleted: false, error: selErr.message };
  }

  if (existing?.id) {
    const { error } = await supabaseExternal
      .from("course_progress")
      .update({ status: "completed", completed_at: nowIso, updated_at: nowIso })
      .eq("id", existing.id);
    if (error) {
      console.error("completeModule update error", error);
      return { ok: false, allCompleted: false, error: error.message };
    }
  } else {
    const { error } = await supabaseExternal.from("course_progress").insert({
      user_id: userId,
      module_id: moduleId,
      status: "completed",
      completed_at: nowIso,
    });
    if (error) {
      console.error("completeModule insert error", error);
      return { ok: false, allCompleted: false, error: error.message };
    }
  }

  // Corso completato? (tutti i moduli del corso risultano 'completed')
  const progress = await fetchCourseProgress(userId);
  const courseId = progress.courseId;
  if (!courseId) return { ok: true, allCompleted: false };

  const moduleIds = await moduleIdsForCourse(courseId);
  const allCompleted =
    moduleIds.length > 0 &&
    moduleIds.every((id) => progress.completedModuleIds.includes(id));

  if (allCompleted) {
    const { error } = await supabaseExternal
      .from("course_progress")
      .update({ course_completed: true, course_completed_at: nowIso })
      .eq("user_id", userId)
      .in("module_id", moduleIds);
    if (error) console.error("completeModule course_completed error", error);
  }

  return { ok: true, allCompleted };
}

export async function insertTestResult(
  userId: string,
  score: number,
  passed: boolean,
): Promise<SaveTestResultResult> {
  const courseId = await resolveCourseId();
  const { error } = await supabaseExternal.from("course_tests").insert({
    user_id: userId,
    course_id: courseId,
    score,
    passed,
    taken_at: new Date().toISOString(),
  });
  if (error) {
    console.error("insertTestResult error", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function findActiveLicense(
  email: string,
): Promise<ActiveLicenseResult> {
  const { data, error } = await supabaseExternal
    .from("licenses")
    .select("id, license_key")
    .ilike("user_email", email)
    .eq("app_code", APP_CODE)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("findActiveLicense error", error);
    return { found: false, licenseId: null, licenseKey: null };
  }
  return {
    found: true,
    licenseId: data.id as string,
    licenseKey: (data.license_key as string | null) ?? null,
  };
}
