import type { FormSchema } from 'formle';
import { describe, expect, it, vi } from 'vitest';
import { useField } from '../../src/composables/use-field';
import { useForm } from '../../src/composables/use-form';

const baseSchema: FormSchema = {
  version: '1',
  fields: [
    { id: 'name', type: 'text', validation: { required: true, minLength: 2 } },
    { id: 'nickname', type: 'text' },
  ],
};

describe('useField', () => {
  it('attrs equals form.fields[name]', () => {
    const form = useForm({ schema: baseSchema, onSubmit: vi.fn() });
    const field = useField('name', form);
    expect(field.attrs.value).toBe(form.fields.value.name);
  });

  it('value get reflects form.values[name]', () => {
    const form = useForm({
      schema: baseSchema,
      onSubmit: vi.fn(),
      initialValues: { name: 'Egor' },
    });
    const field = useField('name', form);
    expect(field.value.value).toBe('Egor');
  });

  it('value set updates form.values[name]', () => {
    const form = useForm({ schema: baseSchema, onSubmit: vi.fn() });
    const field = useField('name', form);
    field.value.value = 'Set';
    expect(form.values.name).toBe('Set');
  });

  it('error is null when no errors', () => {
    const form = useForm({ schema: baseSchema, onSubmit: vi.fn() });
    const field = useField('name', form);
    expect(field.error.value).toBeNull();
  });

  it('error is the first issue after failed handleSubmit', async () => {
    const form = useForm({ schema: baseSchema, onSubmit: vi.fn() });
    const field = useField('name', form);
    await form.handleSubmit();
    expect(field.error.value).not.toBeNull();
    expect(field.error.value?.code).toBe('required');
  });

  it('errors returns the full array', async () => {
    const form = useForm({ schema: baseSchema, onSubmit: vi.fn() });
    const field = useField('name', form);
    expect(field.errors.value).toEqual([]);
    await form.handleSubmit();
    expect(Array.isArray(field.errors.value)).toBe(true);
    expect(field.errors.value.length).toBeGreaterThan(0);
  });

  it('throws when name is not in the schema', () => {
    const form = useForm({ schema: baseSchema, onSubmit: vi.fn() });
    expect(() => useField('missing', form)).toThrow(/missing/);
  });
});
