import type { Field, FormSchema } from '../schema/types';
import type { FormValues, ValidationIssue } from './types';

// Pragmatic email pattern (matches examples/basic): one or more non-`@`,
// non-whitespace chars, an `@`, a domain, a dot, and a TLD. Deliberately NOT an
// RFC-5322-exhaustive regex — it rejects obvious mistakes without false
// negatives on valid-but-exotic addresses that real RFC parsing would allow.
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// String-typed values that are not strings (e.g. number passed in) are treated
// as a missing value: the engine emits a `required` issue when `required` is
// true, and otherwise skips format/length/pattern checks. Coercion is
// deliberately avoided so callers can detect shape mismatches via the issue
// list.
function isMissingText(value: unknown): boolean {
  return typeof value !== 'string' || value.length === 0;
}

// Shared validator for string-typed fields (`text`, `email`, `password`).
// `checkEmailFormat` adds the built-in email format check; `password` carries
// no built-in format rule by design (password policies vary widely and the
// library does not impose one), so it validates exactly like `text`.
function validateStringField(
  field: Field,
  value: unknown,
  checkEmailFormat: boolean,
): ValidationIssue[] {
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

  // Format is checked only on a non-empty value — emptiness is `required`'s
  // job, not the format check's. Ordered after `required` and before the
  // length/pattern rules.
  if (checkEmailFormat && value.length > 0 && !EMAIL_PATTERN.test(value)) {
    issues.push({
      path: field.id,
      code: 'email',
      message: 'Invalid email address',
    });
  }

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
    if (field.type === 'text' || field.type === 'password') {
      issues.push(...validateStringField(field, values[field.id], false));
    } else if (field.type === 'email') {
      issues.push(...validateStringField(field, values[field.id], true));
    }
  }

  return issues;
}
