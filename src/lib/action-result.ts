/**
 * Unified Server Action Result Pattern for Zero Group
 * Standardizes typed outcomes across all Next.js Server Actions.
 */

export type ActionResult<T = void> =
  | { success: true; data: T; error?: never; code?: never }
  | { success: false; error: string; code?: string; data?: never };

export function successResult<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}

export function errorResult(error: string | Error, code?: string): { success: false; error: string; code?: string } {
  const message = error instanceof Error ? error.message : String(error);
  return {
    success: false,
    error: message,
    ...(code ? { code } : {}),
  };
}

export async function safeAction<T>(
  action: () => Promise<T>,
  fallbackErrorMessage = "Operation failed. Please try again."
): Promise<ActionResult<T>> {
  try {
    const data = await action();
    return successResult(data);
  } catch (err: unknown) {
    console.error("[SERVER ACTION ERROR]:", err);
    return errorResult(err instanceof Error ? err : fallbackErrorMessage);
  }
}
