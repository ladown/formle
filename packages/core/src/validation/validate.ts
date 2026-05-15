import type { Field, FormSchema } from '../schema/types';
import type { FormValues, ValidationIssue } from './types';

// Text-typed values that are not strings (e.g. number passed in) are treated
// as a missing value: the engine emits a `required` issue when `required` is
// true, and otherwise skips length/pattern checks. Coercion is deliberately
// avoided so callers can detect shape mismatches via the issue list.
function isMissingText(value: unknown): boolean {
  return typeof value !== 'string' || value.length === 0;
}

function validateTextField(field: Field, value: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const rules = field.validation;
  if (!rules) return issues;

  if (rules.required === true && isMissingText(value)) {
    issues.push({
      path: field.id,
      code: 'required',
      message: 'This field is required',
    });
    return issues;
  }

  if (typeof value !== 'string') return issues;

  if (typeof rules.minLength === 'number' && value.length < rules.minLength) {
    issues.push({
      path: field.id,
      code: 'minLength',
      message: `Must be at least ${rules.minLength} characters`,
      meta: { minLength: rules.minLength, actual: value.length },
    });
  }

  if (typeof rules.maxLength === 'number' && value.length > rules.maxLength) {
    issues.push({
      path: field.id,
      code: 'maxLength',
      message: `Must be at most ${rules.maxLength} characters`,
      meta: { maxLength: rules.maxLength, actual: value.length },
    });
  }

  if (typeof rules.pattern === 'string') {
    const re = new RegExp(rules.pattern);
    if (!re.test(value)) {
      issues.push({
        path: field.id,
        code: 'pattern',
        message: 'Invalid format',
        meta: { pattern: rules.pattern },
      });
    }
  }

  return issues;
}

export function validate(schema: FormSchema, values: FormValues): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const field of schema.fields) {
    if (field.type !== 'text') continue;
    const value = values[field.id];
    issues.push(...validateTextField(field, value));
  }

  return issues;
}
