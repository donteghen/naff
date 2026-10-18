"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/server/errors";

/**
 * Runs a server action from a form or button.
 * Tracks "pending", the error key and per-field error keys, and refreshes page data after a success.
 * In development every result is printed in the browser console, to make debugging easy.
 * When the session has ended, the app goes back to its login page.
 */
export function useAction(loginPath = "/login") {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [errorValues, setErrorValues] = useState<Record<string, string | number> | undefined>(undefined);
  const [fields, setFields] = useState<Record<string, string>>({});

  function run<T>(name: string, action: () => Promise<ActionResult<T>>, onSuccess?: (data: T) => void) {
    startTransition(async () => {
      const result = await action();
      if (process.env.NODE_ENV === "development") console.debug(`[action] ${name} →`, result);
      if (result.ok) {
        setError(null);
        setFields({});
        onSuccess?.(result.data);
        router.refresh();
        return;
      }
      if (result.error === "errors.sessionEnded") {
        router.push(`${loginPath}?ended=1`);
        return;
      }
      if (result.error === "errors.mustChangePin") {
        router.push(loginPath.replace(/login$/, "set-pin"));
        return;
      }
      setError(result.error);
      setErrorValues(result.values);
      setFields(result.fields ?? {});
    });
  }

  function clearErrors() {
    setError(null);
    setFields({});
  }

  return { run, pending, error, errorValues, fields, clearErrors, setError };
}
