import type { Field, FormSchema, FormValues, ValidationIssue } from "formle";
import { validate } from "formle";
import type { ComputedRef, Ref } from "vue";
import { computed, reactive, ref } from "vue";

export type UseFormOptions = {
  schema: FormSchema;
  onSubmit: (values: FormValues) => void | Promise<void>;
  initialValues?: FormValues;
};

export type UseFormReturn = {
  values: FormValues;
  errors: ComputedRef<Record<string, ValidationIssue[]>>;
  isSubmitting: Ref<boolean>;
  isValid: ComputedRef<boolean>;
  handleSubmit: () => Promise<void>;
  reset: () => void;
};

function emptyValueForField(field: Field): unknown {
  switch (field.type) {
    case "text":
    case "email":
    case "password":
    case "textarea":
    case "radio":
    case "select":
      return "";
    case "number":
      return undefined;
    case "checkbox":
      return false;
  }
}

function buildInitialValues(
  schema: FormSchema,
  initialValues: FormValues | undefined,
): FormValues {
  const result: FormValues = {};
  for (const field of schema.fields) {
    if (
      initialValues &&
      Object.prototype.hasOwnProperty.call(initialValues, field.id)
    ) {
      result[field.id] = initialValues[field.id];
      continue;
    }
    if (field.default !== undefined) {
      result[field.id] = field.default;
      continue;
    }
    result[field.id] = emptyValueForField(field);
  }
  return result;
}

export function useForm(options: UseFormOptions): UseFormReturn {
  const { schema, onSubmit, initialValues } = options;

  const values = reactive<FormValues>(
    buildInitialValues(schema, initialValues),
  );
  const isSubmitting = ref(false);
  const issues = ref<ValidationIssue[]>([]);
  const hasValidated = ref(false);

  const errors = computed<Record<string, ValidationIssue[]>>(() => {
    const map: Record<string, ValidationIssue[]> = {};
    for (const field of schema.fields) {
      map[field.id] = [];
    }
    for (const issue of issues.value) {
      const bucket = map[issue.path];
      if (bucket) {
        bucket.push(issue);
      } else {
        map[issue.path] = [issue];
      }
    }
    return map;
  });

  const isValid = computed<boolean>(() => {
    if (!hasValidated.value) return false;
    return issues.value.length === 0;
  });

  const handleSubmit = async (): Promise<void> => {
    isSubmitting.value = true;
    try {
      const result = validate(schema, { ...values });
      issues.value = result;
      hasValidated.value = true;
      if (result.length > 0) return;
      await onSubmit({ ...values });
    } finally {
      isSubmitting.value = false;
    }
  };

  const reset = (): void => {
    const fresh = buildInitialValues(schema, initialValues);
    for (const key of Object.keys(values)) {
      delete values[key];
    }
    Object.assign(values, fresh);
    issues.value = [];
    hasValidated.value = false;
    isSubmitting.value = false;
  };

  return {
    values,
    errors,
    isSubmitting,
    isValid,
    handleSubmit,
    reset,
  };
}
