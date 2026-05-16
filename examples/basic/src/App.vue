<script setup lang="ts">
import type { FormSchema, FormValues } from 'formle';
import { useForm } from 'formle-vue';
import { ref } from 'vue';
import FieldRow from './FieldRow.vue';

const schema: FormSchema = {
  version: '1',
  id: 'create-account',
  fields: [
    {
      id: 'fullName',
      type: 'text',
      label: 'Full name',
      placeholder: 'Ada Lovelace',
      validation: { required: true, minLength: 2 },
    },
    {
      id: 'email',
      type: 'text',
      label: 'Email',
      placeholder: 'you@example.com',
      validation: {
        required: true,
        pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
      },
    },
    {
      id: 'username',
      type: 'text',
      label: 'Username',
      placeholder: 'lowercase, numbers, underscores',
      validation: {
        required: true,
        minLength: 3,
        maxLength: 20,
        pattern: '^[a-z0-9_]+$',
      },
    },
  ],
};

const submitted = ref<FormValues | null>(null);

const form = useForm({
  schema,
  onSubmit: async (values) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    submitted.value = { ...values };
  },
});

function handleReset(): void {
  submitted.value = null;
  form.reset();
}
</script>

<template>
  <!-- All styling lives in this file — Formle ships no styles. -->
  <main class="page">
    <section class="card">
      <header class="card__header">
        <h1>Create your account</h1>
        <p>A minimal demo of the Formle schema, validation, and Vue bindings.</p>
      </header>

      <div v-if="submitted" class="success" role="status">
        <h2>Welcome aboard</h2>
        <p>Submitted values:</p>
        <dl class="summary">
          <template v-for="(value, key) in submitted" :key="key">
            <dt>{{ key }}</dt>
            <dd>{{ value }}</dd>
          </template>
        </dl>
        <button type="button" class="btn btn--ghost" @click="handleReset">
          Reset
        </button>
      </div>

      <form
        v-else
        novalidate
        @submit.prevent="form.handleSubmit()"
      >
        <FieldRow
          v-for="field in schema.fields"
          :key="field.id"
          :field="field"
          :form="form"
        />

        <button
          type="submit"
          class="btn btn--primary"
          :disabled="form.isSubmitting.value"
        >
          {{ form.isSubmitting.value ? 'Creating…' : 'Create account' }}
        </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1.25rem;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
    Cantarell, 'Helvetica Neue', sans-serif;
  color: #1f2937;
  background: #f8fafc;
}

.card {
  width: 100%;
  max-width: 420px;
  padding: 2rem;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.card__header {
  margin-bottom: 1.5rem;
}

.card__header h1 {
  margin: 0 0 0.375rem;
  font-size: 1.375rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.card__header p {
  margin: 0;
  font-size: 0.9rem;
  color: #6b7280;
}

.btn {
  appearance: none;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 0.65rem 1rem;
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 120ms ease,
    border-color 120ms ease,
    color 120ms ease;
}

.btn--primary {
  width: 100%;
  margin-top: 0.5rem;
  background: #111827;
  color: #ffffff;
}

.btn--primary:hover:not(:disabled) {
  background: #1f2937;
}

.btn--primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.btn--ghost {
  background: transparent;
  border-color: #d1d5db;
  color: #374151;
}

.btn--ghost:hover {
  background: #f3f4f6;
}

.success {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.success h2 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.success p {
  margin: 0;
  font-size: 0.9rem;
  color: #6b7280;
}

.summary {
  margin: 0;
  padding: 0.875rem 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  display: grid;
  grid-template-columns: max-content 1fr;
  column-gap: 1rem;
  row-gap: 0.375rem;
  font-size: 0.875rem;
}

.summary dt {
  color: #6b7280;
  font-weight: 500;
}

.summary dd {
  margin: 0;
  color: #111827;
  word-break: break-all;
}
</style>
