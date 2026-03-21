<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQrCodeStore, type QRCode } from '@/stores/useQR';
import QRCodeLib from 'qrcode';


interface Props {
  modelValue: boolean;
  qrCode: QRCode | null;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const qrStore = useQrCodeStore();
const qrCodeDataUri = ref<string>('');

const dialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
});

// Watch for dialog opening and QR code changes to generate image
watch([() => props.modelValue, () => props.qrCode], async ([isOpen, qrCode]) => {
  if (isOpen && qrCode?.qr_link) {
    try {
      const dataUri = await QRCodeLib.toDataURL(qrCode.qr_link, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      qrCodeDataUri.value = dataUri;
    } catch (error) {
      console.error('Error generating QR code:', error);
      qrCodeDataUri.value = '';
    }
  }
}, { immediate: true });

// QR Code image generation
const generateQRCodeImage = async (text: string) => {
  try {
    const dataUri = await QRCodeLib.toDataURL(text, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return dataUri;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
};

// Methods
const downloadQRCode = async () => {
  if (!props.qrCode) return;

  try {
    const dataUri = await generateQRCodeImage(props.qrCode.qr_link);
    const link = document.createElement('a');
    link.download = `qr-code-${props.qrCode.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
    link.href = dataUri;
    link.click();
  } catch (error) {
    console.error('Error downloading QR code:', error);
  }
};

const copyLink = async () => {
  if (!props.qrCode) return;

  try {
    await navigator.clipboard.writeText(props.qrCode.qr_link);
    // You can add a toast notification here
  } catch (error) {
    console.error('Error copying link:', error);
  }
};

const closeDialog = () => {
  dialog.value = false;
};
</script>

<template>
  <v-dialog v-model="dialog" max-width="500">
    <v-card>
      <v-card-title>
        <span class="text-h5">{{ qrCode?.title }}</span>
      </v-card-title>

      <v-card-text class="text-center">
        <!-- QR Code Image -->
        <div class="mb-4">
          <v-img
            v-if="qrCodeDataUri"
            :src="qrCodeDataUri"
            alt="QR Code"
            max-width="300"
            class="mx-auto mb-4"
          />
        </div>

        <!-- QR Code Details -->
        <v-card variant="tonal" class="mb-4">
          <v-card-text>
            <div class="text-body-1 mb-2">
              <strong>Status:</strong>
              <v-chip
                :color="qrCode?.is_active ? 'success' : 'warning'"
                size="small"
                class="ml-2"
              >
                <v-icon start>
                  {{ qrCode?.is_active ? 'mdi-check-circle' : 'mdi-pause-circle' }}
                </v-icon>
                {{ qrCode?.is_active ? 'Active' : 'Inactive' }}
              </v-chip>
            </div>

            <div class="text-body-1 mb-2">
              <strong>Link:</strong>
              <div class="text-body-2 text-medium-emphasis word-break mt-1">
                {{ qrCode?.qr_link }}
              </div>
            </div>

            <div v-if="qrCode?.description" class="text-body-1 mb-2">
              <strong>Description:</strong>
              <div class="text-body-2 text-medium-emphasis mt-1">
                {{ qrCode.description }}
              </div>
            </div>

            <div v-if="qrCode?.created_at" class="text-body-1">
              <strong>Created:</strong>
              <div class="text-body-2 text-medium-emphasis mt-1">
                {{ new Date(qrCode.created_at).toLocaleString() }}
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-card-text>

      <v-card-actions>
        <v-btn
          color="primary"
          variant="tonal"
          @click="downloadQRCode"
        >
          <v-icon start>mdi-download</v-icon>
          Download
        </v-btn>

        <v-btn
          color="info"
          variant="tonal"
          @click="copyLink"
        >
          <v-icon start>mdi-content-copy</v-icon>
          Copy Link
        </v-btn>

        <v-spacer />
        <v-btn @click="closeDialog">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.word-break {
  word-break: break-all;
}
</style>
