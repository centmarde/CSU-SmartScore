<script setup lang="ts">
import { computed } from 'vue';
import { useQrCodeStore, type QRCode } from '@/stores/useQR';

interface Props {
  modelValue: boolean;
  qrCode: QRCode | null;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'deleted', qrCodeId: number): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const qrStore = useQrCodeStore();

const dialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
});

// Methods
const handleDelete = async () => {
  if (!props.qrCode?.id) return;

  const result = await qrStore.deleteQRCode(props.qrCode.id);
  if (result.error === null) {
    emit('deleted', props.qrCode.id);
    dialog.value = false;
  }
};

const closeDialog = () => {
  dialog.value = false;
};
</script>

<template>
  <v-dialog v-model="dialog" max-width="400">
    <v-card>
      <v-card-title class="text-h5">
        <v-icon color="warning" class="mr-2">mdi-alert</v-icon>
        Confirm Delete
      </v-card-title>

      <v-card-text>
        <div class="mb-4">
          Are you sure you want to delete the QR code
          <strong>"{{ qrCode?.title }}"</strong>?
        </div>

        <v-alert
          type="warning"
          variant="tonal"
          class="mb-0"
        >
          This action cannot be undone. The QR code will be permanently removed.
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="closeDialog">Cancel</v-btn>
        <v-btn
          color="error"
          :loading="qrStore.loading"
          @click="handleDelete"
        >
          <v-icon start>mdi-delete</v-icon>
          Delete
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
