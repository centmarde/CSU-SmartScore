<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useQrCodeStore, type QRCode } from '@/stores/useQR';

interface Props {
  modelValue: boolean;
  qrCode: QRCode | null;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'updated', qrCode: QRCode): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const qrStore = useQrCodeStore();

// Form data
const formData = ref<Partial<QRCode>>({
  title: '',
  description: '',
  qr_link: '',
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

// Watch for QR code changes to populate form
watch(() => props.qrCode, (newQRCode) => {
  if (newQRCode) {
    formData.value = { ...newQRCode };
  }
}, { immediate: true });

// Methods
const handleUpdate = async () => {
  if (!isFormValid.value || !props.qrCode?.id) return;

  // Keep the existing QR link or generate a new one if needed
  const qrLink = formData.value.qr_link || qrStore.generateQuizLink();

  const updates: Partial<QRCode> = {
    title: formData.value.title!,
    description: formData.value.description || '',
    qr_link: qrLink,
    is_active: formData.value.is_active!,
  };

  const result = await qrStore.updateQRCode(props.qrCode.id, updates);
  if (result.error === null && result.data) {
    emit('updated', result.data);
    dialog.value = false;
  }
};

const closeDialog = () => {
  dialog.value = false;
};
</script>

<template>
  <v-dialog v-model="dialog" max-width="600">
    <v-card>
      <v-card-title>
        <span class="text-h5">Edit QR Code</span>
      </v-card-title>

      <v-card-text>
        <v-form @submit.prevent="handleUpdate">
          <v-text-field
            v-model="formData.title"
            label="Title *"
            :rules="titleRules"
            required
            variant="outlined"
            class="mb-3"
          />

          <v-textarea
            v-model="formData.description"
            label="Description"
            variant="outlined"
            rows="3"
            class="mb-3"
          />

          <v-text-field
            v-model="formData.qr_link"
            label="QR Link"
            variant="outlined"
            class="mb-3"
            readonly
            hint="QR code link is auto-generated"
          />

          <v-switch
            v-model="formData.is_active"
            label="Active"
            color="primary"
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
          @click="handleUpdate"
        >
          Update
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
