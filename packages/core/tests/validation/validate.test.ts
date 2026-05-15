import { describe, expect, it } from 'vitest';

import type { FormSchema } from '../../src/schema';
import { validate } from '../../src/validation';

function schema(fields: FormSchema['fields']): FormSchema {
  return { version: '1', fields };
}

describe('validate', () => {
  it('returns empty array for valid input', () => {
    const s = schema([
      { id: 'name', type: 'text', validation: { required: true, minLength: 2 } },
    ]);
    expect(validate(s, { name: 'Ada' })).toEqual([]);
  });

  it('returns empty array for an empty schema regardless of values', () => {
    expect(validate(schema([]), {})).toEqual([]);
    expect(validate(schema([]), { stray: 'value' })).toEqual([]);
  });

  it('produces a required issue when a required field is missing', () => {
    const s = schema([{ id: 'name', type: 'text', validation: { required: true } }]);
    const result = validate(s, {});
    expect(result).toEqual([
      { path: 'name', code: 'required', message: 'This field is required' },
    ]);
  });

  it('produces a required issue when a required field is an empty string', () => {
    const s = schema([{ id: 'name', type: 'text', validation: { required: true } }]);
    const result = validate(s, { name: '' });
    expect(result).toHaveLength(1);
    expect(result[0]?.code).toBe('required');
  });

  it('produces a minLength issue with meta containing minLength and actual', () => {
    const s = schema([{ id: 'name', type: 'text', validation: { minLength: 4 } }]);
    const result = validate(s, { name: 'Ada' });
    expect(result).toEqual([
      {
        path: 'name',
        code: 'minLength',
        message: 'Must be at least 4 characters',
        meta: { minLength: 4, actual: 3 },
      },
    ]);
  });

  it('produces a maxLength issue with meta', () => {
    const s = schema([{ id: 'name', type: 'text', validation: { maxLength: 3 } }]);
    const result = validate(s, { name: 'Alice' });
    expect(result).toEqual([
      {
        path: 'name',
        code: 'maxLength',
        message: 'Must be at most 3 characters',
        meta: { maxLength: 3, actual: 5 },
      },
    ]);
  });

  it('produces a pattern issue when value does not match', () => {
    const s = schema([
      { id: 'slug', type: 'text', validation: { pattern: '^[a-z]+$' } },
    ]);
    const result = validate(s, { slug: 'Bad Value' });
    expect(result).toHaveLength(1);
    expect(result[0]?.code).toBe('pattern');
    expect(result[0]?.message).toBe('Invalid format');
  });

  it('collects multiple rule violations on the same field', () => {
    const s = schema([
      {
        id: 'slug',
        type: 'text',
        validation: { minLength: 5, pattern: '^[a-z]+$' },
      },
    ]);
    const result = validate(s, { slug: 'AB' });
    expect(result.map((i) => i.code)).toEqual(['minLength', 'pattern']);
  });

  it('reports issues across multiple fields with correct paths', () => {
    const s = schema([
      { id: 'first', type: 'text', validation: { required: true } },
      { id: 'second', type: 'text', validation: { minLength: 3 } },
    ]);
    const result = validate(s, { second: 'no' });
    expect(result).toEqual([
      { path: 'first', code: 'required', message: 'This field is required' },
      {
        path: 'second',
        code: 'minLength',
        message: 'Must be at least 3 characters',
        meta: { minLength: 3, actual: 2 },
      },
    ]);
  });

  it('does not check minLength when required has already failed', () => {
    const s = schema([
      {
        id: 'name',
        type: 'text',
        validation: { required: true, minLength: 5 },
      },
    ]);
    const result = validate(s, {});
    expect(result).toHaveLength(1);
    expect(result[0]?.code).toBe('required');
  });

  it('skips length and pattern checks when a non-required value is missing', () => {
    const s = schema([
      {
        id: 'name',
        type: 'text',
        validation: { minLength: 2, pattern: '^[a-z]+$' },
      },
    ]);
    expect(validate(s, {})).toEqual([]);
  });
});
