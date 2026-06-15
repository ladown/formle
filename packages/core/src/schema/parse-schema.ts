import { FormleSchemaError, type SchemaIssue } from './errors';
import type { FormSchema } from './types';

const SUPPORTED_FIELD_TYPES = new Set(['text', 'email', 'password']);

// email and password are string-typed fields: they accept the same validation
// rules as text. email adds a built-in format check in the validator; password
// carries no built-in format rule by design (see validation/validate.ts).
const STRING_FIELD_VALIDATION_KEYS = new Set([
  'required',
  'minLength',
  'maxLength',
  'pattern',
  'custom',
]);

const VALID_VALIDATION_KEYS_BY_TYPE: Record<string, ReadonlySet<string>> = {
  text: STRING_FIELD_VALIDATION_KEYS,
  email: STRING_FIELD_VALIDATION_KEYS,
  password: STRING_FIELD_VALIDATION_KEYS,
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collectFieldIssues(
  field: unknown,
  path: string,
  issues: SchemaIssue[],
  seenIds: Map<string, number>,
  index: number,
): void {
  if (!isPlainObject(field)) {
    issues.push({ path, message: 'field must be an object' });
    return;
  }

  const { id, type, validation } = field;

  if (typeof id !== 'string' || id.length === 0) {
    issues.push({ path: `${path}.id`, message: 'field id must be a non-empty string' });
  } else {
    const previousIndex = seenIds.get(id);
    if (previousIndex !== undefined) {
      issues.push({
        path: `${path}.id`,
        message: `duplicate field id "${id}" (also at fields[${previousIndex}])`,
      });
    } else {
      seenIds.set(id, index);
    }
  }

  if (typeof type !== 'string') {
    issues.push({ path: `${path}.type`, message: 'field type must be a string' });
    return;
  }

  if (!SUPPORTED_FIELD_TYPES.has(type)) {
    issues.push({
      path: `${path}.type`,
      message: `unsupported field type "${type}"`,
    });
    return;
  }

  if (validation !== undefined) {
    if (!isPlainObject(validation)) {
      issues.push({ path: `${path}.validation`, message: 'validation must be an object' });
    } else {
      const allowed = VALID_VALIDATION_KEYS_BY_TYPE[type];
      if (allowed) {
        for (const key of Object.keys(validation)) {
          if (!allowed.has(key)) {
            issues.push({
              path: `${path}.validation.${key}`,
              message: `validation rule "${key}" is not valid for field type "${type}"`,
            });
          }
        }
      }
    }
  }
}

function assertFormSchema(input: unknown): asserts input is FormSchema {
  const issues: SchemaIssue[] = [];

  if (!isPlainObject(input)) {
    issues.push({ path: '', message: 'schema must be an object' });
    throw new FormleSchemaError(issues);
  }

  if (input.version !== '1') {
    issues.push({
      path: 'version',
      message: `schema version must be "1" (got ${JSON.stringify(input.version)})`,
    });
  }

  const { fields } = input;
  if (!Array.isArray(fields)) {
    issues.push({ path: 'fields', message: 'fields must be an array' });
  } else {
    const seenIds = new Map<string, number>();
    for (let i = 0; i < fields.length; i += 1) {
      collectFieldIssues(fields[i], `fields[${i}]`, issues, seenIds, i);
    }
  }

  if (issues.length > 0) {
    throw new FormleSchemaError(issues);
  }
}

export function parseSchema(input: unknown): FormSchema {
  assertFormSchema(input);
  return input;
}
