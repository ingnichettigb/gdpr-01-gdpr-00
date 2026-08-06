/**
 * DTO client-safe per le tabelle corso del database esterno.
 * Nessun import server-only: questo file puo' entrare nel bundle client.
 */

export type CourseModuleDTO = {
  id: string;
  title: string;
  youtube_url: string | null;
  order_index: number;
  duration_seconds: number | null;
};

export type CourseModulesResult = {
  courseId: string | null;
  modules: CourseModuleDTO[];
};

export type CourseProgressResult = {
  courseId: string | null;
  completedModuleIds: string[];
  courseCompleted: boolean;
};

export type MarkModuleResult = {
  ok: boolean;
  allCompleted: boolean;
  error?: string;
};

export type SaveTestResultResult = {
  ok: boolean;
  error?: string;
};

export type ActiveLicenseResult = {
  found: boolean;
  licenseId: string | null;
  licenseKey: string | null;
  puk: string | null;
};
