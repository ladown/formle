import type { ValidationIssue } from "@formle/core";
import type { ComputedRef, WritableComputedRef } from "vue";
import { computed } from "vue";
import type { FieldBindings, UseFormReturn } from "./use-form";

export type UseFieldReturn = {
  attrs: ComputedRef<FieldBindings>;
  value: WritableComputedRef<unknown>;
  error: ComputedRef<ValidationIssue | null>;
  errors: ComputedRef<ValidationIssue[]>;
};

export function useField(name: string, form: UseFormReturn): UseFieldReturn {
  if (form.fields.value[name] === undefined) {
    throw new Error(
      `useField: field "${name}" is not defined in the form schema`,
    );
  }

  const attrs = computed<FieldBindings>(() => {
    const bindings = form.fields.value[name];
    if (!bindings) {
      throw new Error(
        `useField: field "${name}" is not defined in the form schema`,
      );
    }
    return bindings;
  });

  const value = computed<unknown>({
    get: () => form.values[name],
    set: (next) => {
      form.values[name] = next;
    },
  });

  const errors = computed<ValidationIssue[]>(
    () => form.errors.value[name] ?? [],
  );
  const error = computed<ValidationIssue | null>(() => errors.value[0] ?? null);

  return { attrs, value, error, errors };
}
