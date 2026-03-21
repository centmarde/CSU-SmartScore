<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useQrCodeStore, type QRCode } from '@/stores/useQR';
import CreateQRDialog from '../dialogs/CreateQRDialog.vue';
import UpdateQRDialog from '../dialogs/UpdateQRDialog.vue';
import DeleteQRDialog from '../dialogs/DeleteQRDialog.vue';
import ConfirmationDialog from '../dialogs/ConfirmationDialog.vue';

const qrStore = useQrCodeStore();

// Search
const search = ref('');

// Dialog states
const createDialog = ref(false);
const editDialog = ref(false);
const deleteDialog = ref(false);
const viewDialog = ref(false);

// Selected QR code for dialogs
const selectedQRCode = ref<QRCode | null>(null);

// Table headers for data table
const headers = [
  { title: 'Title', key: 'title', sortable: true },
  { title: 'Status', key: 'is_active', sortable: true },
  { title: 'Created', key: 'created_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false },
];

const formattedQRCodes = computed(() => {
  return qrStore.qrCodes.map(qr => ({
    ...qr,
    created_at: qr.created_at ? new Date(qr.created_at).toLocaleDateString() : 'N/A'
  }));
});

// Methods
const openCreateDialog = () => {
  createDialog.value = true;
};

const openEditDialog = (qrCode: QRCode) => {
  selectedQRCode.value = qrCode;
  editDialog.value = true;
};

const openDeleteDialog = (qrCode: QRCode) => {
  selectedQRCode.value = qrCode;
  deleteDialog.value = true;
};

const openViewDialog = (qrCode: QRCode) => {
  selectedQRCode.value = qrCode;
  viewDialog.value = true;
};

// Dialog event handlers
const onQRCodeCreated = (qrCode: QRCode) => {
  // QR code is already added to the store by the dialog
  console.log('QR code created:', qrCode);
};

const onQRCodeUpdated = (qrCode: QRCode) => {
  // QR code is already updated in the store by the dialog
  console.log('QR code updated:', qrCode);
};

const onQRCodeDeleted = (qrCodeId: number) => {
  // QR code is already removed from the store by the dialog
  console.log('QR code deleted:', qrCodeId);
};

const toggleStatus = async (qrCode: QRCode) => {
  if (!qrCode.id) return;
  await qrStore.toggleQRCodeStatus(qrCode.id, !qrCode.is_active);
};

const downloadQRCode = async (qrCode: QRCode) => {
  try {
    const QRCodeLib = await import('qrcode');
    const dataUri = await QRCodeLib.default.toDataURL(qrCode.qr_link, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    const link = document.createElement('a');
    link.download = `qr-code-${qrCode.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
    link.href = dataUri;
    link.click();
  } catch (error) {
    console.error('Error downloading QR code:', error);
  }
};

// Lifecycle
onMounted(() => {
  qrStore.fetchQRCodes();
});
</script>

<template>
  <v-container fluid>
    <!-- Header Section -->
    <v-row class="mb-4">
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center">
          <div>
            <h2 class="text-h4 font-weight-bold">QR Code Management</h2>
            <p class="text-body-1 text-medium-emphasis">
              Create and manage QR codes for student quiz access
            </p>
          </div>
          <v-btn
            color="primary"
            size="large"
            prepend-icon="mdi-plus"
            @click="openCreateDialog"
          >
            Create QR Code
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Stats Cards -->
    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-card class="pa-4">
          <div class="d-flex align-center">
            <v-icon size="40" color="primary" class="mr-3">mdi-qrcode</v-icon>
            <div>
              <div class="text-h4 font-weight-bold">{{ qrStore.qrCodes.length }}</div>
              <div class="text-body-2 text-medium-emphasis">Total QR Codes</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card class="pa-4">
          <div class="d-flex align-center">
            <v-icon size="40" color="success" class="mr-3">mdi-check-circle</v-icon>
            <div>
              <div class="text-h4 font-weight-bold">
                {{ qrStore.qrCodes.filter(qr => qr.is_active).length }}
              </div>
              <div class="text-body-2 text-medium-emphasis">Active</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card class="pa-4">
          <div class="d-flex align-center">
            <v-icon size="40" color="warning" class="mr-3">mdi-pause-circle</v-icon>
            <div>
              <div class="text-h4 font-weight-bold">
                {{ qrStore.qrCodes.filter(qr => !qr.is_active).length }}
              </div>
              <div class="text-body-2 text-medium-emphasis">Inactive</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card class="pa-4">
          <div class="d-flex align-center">
            <v-icon size="40" color="info" class="mr-3">mdi-link</v-icon>
            <div>
              <div class="text-h4 font-weight-bold">{{ qrStore.qrCodes.length }}</div>
              <div class="text-body-2 text-medium-emphasis">Total Links</div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Data Table -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex justify-space-between align-center">
            <span>QR Codes</span>
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Search QR codes..."
              single-line
              hide-details
              density="compact"
              style="max-width: 300px;"
            />
          </v-card-title>

          <v-data-table
            :headers="headers"
            :items="formattedQRCodes"
            :loading="qrStore.loading"
            :search="search"
            item-value="id"
          >
            <!-- Status column -->
            <template #item.is_active="{ item }">
              <v-chip
                :color="item.is_active ? 'success' : 'warning'"
                size="small"
                @click="toggleStatus(item)"
                class="cursor-pointer"
              >
                <v-icon start>
                  {{ item.is_active ? 'mdi-check-circle' : 'mdi-pause-circle' }}
                </v-icon>
                {{ item.is_active ? 'Active' : 'Inactive' }}
              </v-chip>
            </template>

            <!-- Actions column -->
            <template #item.actions="{ item }">
              <div class="d-flex align-center gap-1">
                <v-btn
                  icon="mdi-eye"
                  size="small"
                  variant="text"
                  @click="openViewDialog(item)"
                />
                <v-btn
                  icon="mdi-pencil"
                  size="small"
                  variant="text"
                  @click="openEditDialog(item)"
                />
                <v-btn
                  icon="mdi-download"
                  size="small"
                  variant="text"
                  @click="downloadQRCode(item)"
                />
                <v-btn
                  icon="mdi-delete"
                  size="small"
                  variant="text"
                  color="error"
                  @click="openDeleteDialog(item)"
                />
              </div>
            </template>

            <!-- No data slot -->
            <template #no-data>
              <div class="text-center pa-4">
                <v-icon size="64" color="grey">mdi-qrcode-remove</v-icon>
                <div class="text-h6 mt-2">No QR codes found</div>
                <div class="text-body-2 text-medium-emphasis">
                  Create your first QR code to get started
                </div>
                <v-btn
                  color="primary"
                  class="mt-4"
                  @click="openCreateDialog"
                >
                  Create QR Code
                </v-btn>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialog Components -->
    <CreateQRDialog
      v-model="createDialog"
      @created="onQRCodeCreated"
    />

    <UpdateQRDialog
      v-model="editDialog"
      :qr-code="selectedQRCode"
      @updated="onQRCodeUpdated"
    />

    <ConfirmationDialog
      v-model="viewDialog"
      :qr-code="selectedQRCode"
    />

    <DeleteQRDialog
      v-model="deleteDialog"
      :qr-code="selectedQRCode"
      @deleted="onQRCodeDeleted"
    />
  </v-container>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.word-break {
  word-break: break-all;
}
</style>
