<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import QRCode from 'qrcode'
import { type AnswerKey } from '@/stores/answerKeysData'

// Props
interface Props {
  modelValue: boolean
  quiz: AnswerKey | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const router = useRouter()
const toast = useToast()

// Refs
const qrCodeDataUrl = ref<string>('')
const qrCodeLoading = ref(false)

// Computed properties
const dialogValue = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

// Methods
const closeDialog = () => {
  dialogValue.value = false
}

const editAnswerKey = () => {
  closeDialog()
  router.push('/teachertab/teacher-answer-key')
}

const openQrLink = () => {
  if (props.quiz?.qr_link) {
    window.open(props.quiz.qr_link, '_blank')
  }
}

const copyToClipboard = async () => {
  if (props.quiz?.qr_link) {
    try {
      await navigator.clipboard.writeText(props.quiz.qr_link)
      toast.success('Link copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      toast.error('Failed to copy link to clipboard')
    }
  }
}

// Generate QR Code
const generateQRCode = async (url: string) => {
  if (!url) return

  qrCodeLoading.value = true
  try {
    const dataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    })
    qrCodeDataUrl.value = dataUrl
  } catch (error) {
    console.error('Error generating QR code:', error)
    toast.error('Failed to generate QR code')
  } finally {
    qrCodeLoading.value = false
  }
}

// Watch for quiz changes and generate QR code
watch(
  () => props.quiz?.qr_link,
  async (newLink) => {
    if (newLink && props.modelValue) {
      await nextTick()
      await generateQRCode(newLink)
    }
  },
  { immediate: true }
)

// Watch for dialog open/close
watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen && props.quiz?.qr_link) {
      await nextTick()
      await generateQRCode(props.quiz.qr_link)
    } else {
      qrCodeDataUrl.value = ''
    }
  }
)
</script>

<template>
  <v-dialog
    v-model="dialogValue"
    max-width="500px"
    @click:outside="closeDialog"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <v-icon class="mr-2" color="primary">mdi-qrcode</v-icon>
          Quiz QR Code
          <div class="text-subtitle-2 text-grey mt-1">
            {{ quiz?.title || 'Quiz' }}
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="closeDialog"
        />
      </v-card-title>

      <v-divider />

      <v-card-text class="text-center pa-6">
        <div v-if="quiz" class="qr-container">
          <!-- QR Code Display -->
          <div class="qr-code-wrapper mb-4">
            <div v-if="qrCodeLoading" class="qr-loading">
              <v-progress-circular
                indeterminate
                color="primary"
                size="64"
              />
              <div class="mt-2 text-body-2">Generating QR Code...</div>
            </div>
            <img
              v-else-if="qrCodeDataUrl"
              :src="qrCodeDataUrl"
              alt="QR Code"
              class="qr-image"
            />
            <div v-else class="qr-error">
              <v-icon size="64" color="grey-lighten-1">mdi-qrcode-remove</v-icon>
              <div class="mt-2 text-body-2">Unable to generate QR code</div>
            </div>
          </div>

          <!-- Quiz Info -->
          <div class="quiz-info mb-4">
            <h3 class="text-h6 mb-2">{{ quiz.title }}</h3>
            <p v-if="quiz.description" class="text-body-2 text-grey mb-2">
              {{ quiz.description }}
            </p>
            <v-chip
              :color="quiz.is_active ? 'success' : 'error'"
              size="small"
              variant="flat"
              class="mb-2"
            >
              {{ quiz.is_active ? 'Active' : 'Inactive' }}
            </v-chip>
          </div>

          <!-- QR Link Display -->
          <div class="qr-link-section">
            <v-text-field
              :model-value="quiz.qr_link"
              label="QR Code Link"
              readonly
              variant="outlined"
              density="compact"
              append-inner-icon="mdi-content-copy"
              @click:append-inner="copyToClipboard"
            />
          </div>
        </div>

        <div v-else class="text-center py-4">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">
            mdi-qrcode-remove
          </v-icon>
          <h3 class="text-h6 mb-2">No QR Code Available</h3>
          <p class="text-body-2 text-grey">Please select a valid quiz</p>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="justify-space-between">
        <v-btn
          variant="outlined"
          prepend-icon="mdi-open-in-new"
          @click="openQrLink"
          :disabled="!quiz?.qr_link"
        >
          Open QR Link
        </v-btn>

        <div class="d-flex gap-2">
          <v-btn
            color="primary"
            variant="flat"
            prepend-icon="mdi-pencil"
            @click="editAnswerKey"
          >
            Edit Answer Key
          </v-btn>
          <v-btn
            variant="outlined"
            @click="closeDialog"
          >
            Close
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.qr-container {
  max-width: 100%;
}

.qr-code-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  /* background-color: #f5f5f5; */
  border-radius: 8px;
  padding: 16px;
  border: 2px solid #e0e0e0;
  min-height: 300px;
}

.qr-image {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background-color: white;
  padding: 8px;
}

.qr-loading,
.qr-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
}

.quiz-info {
  text-align: center;
}

.qr-link-section {
  margin-top: 16px;
}
</style>
