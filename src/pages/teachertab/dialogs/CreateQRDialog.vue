<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQrCodeStore, type QRCode } from '@/stores/useQR';

interface Props {
  modelValue: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'created', qrCode: QRCode): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const qrStore = useQrCodeStore();

// Form data
const formData = ref<Partial<QRCode>>({
  title: '',
  description: '',
  is_active: true,
});

// Form validation rules
const titleRules = [
  (v: string) => !!v || 'Title is required',
  (v: string) => v.length <= 100 || 'Title must be less than 100 characters',
];

// Computed properties
const isFormValid = computed(() => {
  return formData.value.title && formData.value.title.length > 0;
});

const dialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
});

// Methods
const handleCreate = async () => {
  if (!isFormValid.value) return;

  // Generate a basic quiz link
  const qrLink = qrStore.generateQuizLink();

  const qrCodeData: Omit<QRCode, 'id' | 'created_at' | 'updated_at'> = {
    title: formData.value.title!,
    description: formData.value.description || '',
    qr_link: qrLink,
    is_active: formData.value.is_active!,
  };

  const result = await qrStore.createQRCode(qrCodeData);
  if (result.error === null && result.data) {
    emit('created', result.data);
    resetForm();
    dialog.value = false;
  }
};

const resetForm = () => {
  formData.value = {
    title: '',
    description: '',
    is_active: true,
  };
};

const closeDialog = () => {
  resetForm();
  dialog.value = false;
};
</script>

<template>
  <v-dialog v-model="dialog" max-width="600">
    <v-card>
      <v-card-title>
        <span class="text-h5">Create New QR Code</span>
      </v-card-title>

      <v-card-text>
        <v-form @submit.prevent="handleCreate">
          <v-text-field
            v-model="formData.title"
            label="Title *"
            :rules="titleRules"
            required
            variant="outlined"
            class="mb-3"
            placeholder="Enter QR code title"
          />

          <v-textarea
            v-model="formData.description"
            label="Description"
            variant="outlined"
            rows="3"
            class="mb-3"
            placeholder="Optional description"
          />

          <v-text-field
            v-model="formData.qr_link"
            label="Custom Link (optional)"
            variant="outlined"
            class="mb-3"
            placeholder="Leave empty to use default quiz link"
            hint="If empty, will use default quiz link"
          />

          <v-switch
            v-model="formData.is_active"
            label="Active"
            color="primary"
            hide-details
          />
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="closeDialog">Cancel</v-btn>
        <v-btn
          color="primary"
          :disabled="!isFormValid"
          :loading="qrStore.loading"
          @click="handleCreate"
        >
          Create
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
