import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";

type MutableError = { message?: unknown; [key: string]: unknown };

function translateInPlace(node: unknown, translate: (code: string) => string | undefined): void {
  if (typeof node !== "object" || node === null) return;
  const error = node as MutableError;
  if (typeof error.message === "string") error.message = translate(error.message);
  // Nested field groups / arrays; `ref` is a DOM element and must not be walked.
  for (const [key, child] of Object.entries(error)) {
    if (key !== "ref" && key !== "message" && typeof child === "object") translateInPlace(child, translate);
  }
}

/**
 * Wraps a resolver (zodResolver) so the stable error codes returned by our schemas (e.g. "password_too_short")
 * become translated text before react-hook-form hands them to <FormMessage>. Each feature supplies its own
 * `translate` (code -> text), keeping feature text inside the feature.
 */
export function translateErrors<TIn extends FieldValues, TContext, TOut extends FieldValues | undefined>(
  resolver: Resolver<TIn, TContext, TOut>,
  translate: (code: string) => string | undefined,
): Resolver<TIn, TContext, TOut> {
  return async (values, context, options) => {
    const result = await resolver(values, context, options);
    translateInPlace(result.errors as FieldErrors<TIn>, translate);
    return result;
  };
}
