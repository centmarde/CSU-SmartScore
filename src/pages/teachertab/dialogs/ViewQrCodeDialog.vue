<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useAnswerKeysStore, type AnswerKey } from '@/stores/answerKeysData'
import QRCode from 'qrcode'
import jsPDF from 'jspdf'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const answerKeysStore = useAnswerKeysStore()

// State
const qrCodeDataUrl = ref<string>('')
const generating = ref(false)

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const selectedAnswerKey = computed(() => answerKeysStore.selectedAnswerKey)

// Functions
const generateQRCode = async () => {
  if (!selectedAnswerKey.value?.qr_link) return

  generating.value = true
  try {
    const dataUrl = await QRCode.toDataURL(selectedAnswerKey.value.qr_link, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
    qrCodeDataUrl.value = dataUrl
  } catch (error) {
    console.error('Error generating QR code:', error)
  } finally {
    generating.value = false
  }
}

const downloadAsImage = () => {
  if (!qrCodeDataUrl.value || !selectedAnswerKey.value) return

  const link = document.createElement('a')
  link.download = `qr-code-${selectedAnswerKey.value.title.replace(/[^a-zA-Z0-9]/g, '-')}.png`
  link.href = qrCodeDataUrl.value
  link.click()
}

const downloadAsPDF = async () => {
  if (!qrCodeDataUrl.value || !selectedAnswerKey.value) return

  try {
    const pdf = new jsPDF()
    const pageWidth = pdf.internal.pageSize.width
    const qrCodeSize = 80

    // Add centered title
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    const titleText = 'Answer Key QR Code'
    const titleWidth = pdf.getTextWidth(titleText)
    pdf.text(titleText, (pageWidth - titleWidth) / 2, 30)

    // Add answer key details
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(12)
    pdf.text(`Title: ${selectedAnswerKey.value.title}`, 20, 50)

    let currentY = 65
    if (selectedAnswerKey.value.description) {
      const description = selectedAnswerKey.value.description
      const maxWidth = pageWidth - 40 // 20px margin on each side
      const lines = pdf.splitTextToSize(description, maxWidth)
      pdf.text('Description:', 20, currentY)
      pdf.text(lines, 20, currentY + 10)
      currentY += 10 + (lines.length * 5) + 10
    }

    // Add centered QR code image
    const qrX = (pageWidth - qrCodeSize) / 2
    const qrY = currentY + 10
    pdf.addImage(qrCodeDataUrl.value, 'PNG', qrX, qrY, qrCodeSize, qrCodeSize)

    // Add centered URL below QR code
    pdf.setFontSize(10)
    pdf.text('Scan this QR code or visit:', 20, qrY + qrCodeSize + 20)

    const urlWidth = pdf.getTextWidth(selectedAnswerKey.value.qr_link)
    const urlX = Math.max(20, Math.min((pageWidth - urlWidth) / 2, pageWidth - urlWidth - 20))
    pdf.text(selectedAnswerKey.value.qr_link, urlX, qrY + qrCodeSize + 35)

    // Add timestamp (right aligned)
    const timestamp = `Generated: ${new Date().toLocaleDateString()}`
    const timestampWidth = pdf.getTextWidth(timestamp)
    pdf.text(timestamp, pageWidth - timestampWidth - 20, qrY + qrCodeSize + 55)

    // Save the PDF
    pdf.save(`qr-code-${selectedAnswerKey.value.title.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`)
  } catch (error) {
    console.error('Error generating PDF:', error)
  }
}

const copyToClipboard = async () => {
  if (!selectedAnswerKey.value?.qr_link) return

  try {
    await navigator.clipboard.writeText(selectedAnswerKey.value.qr_link)
    // You can add a toast notification here
  } catch (error) {
    console.error('Error copying to clipboard:', error)
  }
}

const openLink = () => {
  if (!selectedAnswerKey.value?.qr_link) return
  window.open(selectedAnswerKey.value.qr_link, '_blank')
}

const handleClose = () => {
  isOpen.value = false
  qrCodeDataUrl.value = ''
}

// Watch for dialog open
watch(isOpen, async (newVal) => {
  if (newVal) {
    await nextTick()
    generateQRCode()
  }
})
</script>

<template>
  <v-dialog
    v-model="isOpen"
    max-width="600"
    persistent
  >
    <v-card>
      <v-card-title class="text-h5 font-weight-bold d-flex align-center">
        <v-icon class="mr-2" color="primary">mdi-qrcode</v-icon>
        QR Code
      </v-card-title>

      <v-card-text>
        <div v-if="selectedAnswerKey" class="text-center">
          <!-- Answer Key Info -->
          <v-card variant="outlined" class="mb-4">
            <v-card-text>
              <div class="d-flex align-center justify-space-between">
                <div class="text-left">
                  <div class="text-h6 font-weight-medium">{{ selectedAnswerKey.title }}</div>
                  <div v-if="selectedAnswerKey.description" class="text-body-2 text-medium-emphasis mt-1">
                    {{ selectedAnswerKey.description }}
                  </div>
                  <v-chip
                    :color="selectedAnswerKey.is_active ? 'success' : 'error'"
                    size="small"
                    variant="flat"
                    class="mt-2"
                  >
                    {{ selectedAnswerKey.is_active ? 'Active' : 'Inactive' }}
                  </v-chip>
                </div>
                <v-chip size="small" color="primary" variant="outlined">
                  #{{ selectedAnswerKey.id }}
                </v-chip>
              </div>
            </v-card-text>
          </v-card>

          <!-- QR Code Display -->
          <div class="qr-code-container mb-4">
            <v-progress-circular
              v-if="generating"
              indeterminate
              color="primary"
              size="100"
            />
            <div v-else-if="qrCodeDataUrl" class="qr-code-wrapper">
              <img
                :src="qrCodeDataUrl"
                alt="QR Code"
                class="qr-code-image"
              />
            </div>
            <v-alert v-else type="error" variant="tonal">
              Failed to generate QR code
            </v-alert>
          </div>

          <!-- URL Display -->
          <v-card variant="outlined" class="mb-4">
            <v-card-text>
              <div class="text-subtitle-2 mb-2">Quiz URL:</div>
              <div class="d-flex align-center">
                <v-text-field
                  :model-value="selectedAnswerKey.qr_link"
                  readonly
                  variant="outlined"
                  density="compact"
                  class="me-2"
                  hide-details
                />
                <v-btn
                  icon="mdi-content-copy"
                  variant="text"
                  @click="copyToClipboard"
                  size="small"
                />
              </div>
            </v-card-text>
          </v-card>

          <!-- Download Options -->
          <v-card variant="outlined">
            <v-card-title class="text-subtitle-1">
              Download Options
            </v-card-title>
            <v-card-text>
              <div class="d-flex gap-2 justify-center flex-wrap">
                <v-btn
                  color="primary"
                  variant="flat"
                  prepend-icon="mdi-download"
                  @click="downloadAsImage"
                  :disabled="!qrCodeDataUrl"
                >
                  Download PNG
                </v-btn>

                <v-btn
                  color="secondary"
                  variant="flat"
                  prepend-icon="mdi-file-pdf-box"
                  @click="downloadAsPDF"
                  :disabled="!qrCodeDataUrl"
                >
                  Download PDF
                </v-btn>

                <v-btn
                  color="info"
                  variant="outlined"
                  prepend-icon="mdi-open-in-new"
                  @click="openLink"
                >
                  Open Link
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="outlined"
          @click="handleClose"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.qr-code-container {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.qr-code-wrapper {
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.qr-code-image {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

.gap-2 {
  gap: 8px;
}
</style>
