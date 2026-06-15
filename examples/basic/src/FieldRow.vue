<script setup lang="ts">
import type { Field } from "@formle/core";
import { useField, type UseFormReturn } from "@formle/vue";
import { computed } from "vue";

const props = defineProps<{
  field: Field;
  form: UseFormReturn;
}>();

const { attrs, error } = useField(props.field.id, props.form);

// The headless consumer chooses the HTML input type from the schema field type.
const inputType = computed(() => {
  switch (props.field.type) {
    case "email":
      return "email";
    case "password":
      return "password";
    default:
      return "text";
  }
});
</script>

<template>
  <div class="field">
    <label :for="field.id">{{ field.label }}</label>
    <input
      :id="field.id"
      :type="inputType"
      class="input"
      :class="{ 'input--error': error !== null }"
      :placeholder="field.placeholder"
      v-bind="attrs"
    />
    <p v-if="error !== null" class="error">{{ error.message }}</p>
  </div>
</template>

<style scoped>
.field {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #374151;
}

.input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  font: inherit;
  color: inherit;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  outline: none;
  transition:
    border-color 120ms ease,
    box-shadow 120ms ease;
  box-sizing: border-box;
}

.input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
}

.input--error {
  border-color: #dc2626;
}

.input--error:focus {
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.18);
}

.error {
  margin: 0;
  font-size: 0.8rem;
  color: #b91c1c;
}
</style>
