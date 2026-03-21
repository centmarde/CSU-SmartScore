import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { supabase } from '@/lib/supabase';
import { useToast } from 'vue-toastification';

// Define the base domain for the quiz application
const BASE_DOMAIN = 'https://csu-smart-score.vercel.app';
const QUIZ_PATH = '/student/quiz';

// Define QR Code interface
export interface QRCode {
  id?: number;
  title: string;
  description?: string;
  qr_link: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

/**
 * Pinia Store for managing QR code generation parameters and logic.
 * This is meant to be used by teachers to manage quiz QR codes.
 */
export const useQrCodeStore = defineStore('qrCode', () => {
    const toast = useToast();

    // State: Configuration for the quiz system
    const quizConfig = ref({
        // The base URL used for the QR code link (to the student quiz)
        baseUrl: `${BASE_DOMAIN}${QUIZ_PATH}`,
    });

    // State: QR codes data
    const qrCodes = ref<QRCode[]>([]);
    const loading = ref(false);
    const selectedQRCode = ref<QRCode | null>(null);

    /**
     * Constructs a quiz URL with optional parameters
     * @param params Optional query parameters
     * @returns The full URL string
     */
    const generateQuizLink = (params?: Record<string, string | number>): string => {
        const url = new URL(quizConfig.value.baseUrl);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.set(key, value.toString());
            });
        }
        return url.toString();
    };

    /**
     * Fetch all QR codes from the database
     */
    const fetchQRCodes = async () => {
        loading.value = true;
        try {
            const { data, error } = await supabase
                .from('qr_codes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            qrCodes.value = data || [];
            return { data, error: null };
        } catch (error: any) {
            console.error('Error fetching QR codes:', error);
            toast.error('Failed to fetch QR codes');
            return { data: null, error };
        } finally {
            loading.value = false;
        }
    };

    /**
     * Create a new QR code record in the database
     */
    const createQRCode = async (qrCodeData: Omit<QRCode, 'id' | 'created_at' | 'updated_at'>) => {
        loading.value = true;
        try {
            const { data: userData } = await supabase.auth.getUser();

            const qrCodeWithUser = {
                ...qrCodeData,
                created_by: userData.user?.id
            };

            const { data, error } = await supabase
                .from('qr_codes')
                .insert([qrCodeWithUser])
                .select()
                .single();

            if (error) throw error;

            qrCodes.value.unshift(data);
            toast.success('QR code created successfully!');
            return { data, error: null };
        } catch (error: any) {
            console.error('Error creating QR code:', error);
            toast.error('Failed to create QR code');
            return { data: null, error };
        } finally {
            loading.value = false;
        }
    };

    /**
     * Update an existing QR code record
     */
    const updateQRCode = async (id: number, updates: Partial<QRCode>) => {
        loading.value = true;
        try {
            const updateData = {
                ...updates,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('qr_codes')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            const index = qrCodes.value.findIndex(qr => qr.id === id);
            if (index !== -1) {
                qrCodes.value[index] = { ...qrCodes.value[index], ...data };
            }

            toast.success('QR code updated successfully!');
            return { data, error: null };
        } catch (error: any) {
            console.error('Error updating QR code:', error);
            toast.error('Failed to update QR code');
            return { data: null, error };
        } finally {
            loading.value = false;
        }
    };

    /**
     * Delete a QR code record
     */
    const deleteQRCode = async (id: number) => {
        loading.value = true;
        try {
            const { error } = await supabase
                .from('qr_codes')
                .delete()
                .eq('id', id);

            if (error) throw error;

            qrCodes.value = qrCodes.value.filter(qr => qr.id !== id);
            toast.success('QR code deleted successfully!');
            return { error: null };
        } catch (error: any) {
            console.error('Error deleting QR code:', error);
            toast.error('Failed to delete QR code');
            return { error };
        } finally {
            loading.value = false;
        }
    };

    /**
     * Toggle QR code active status
     */
    const toggleQRCodeStatus = async (id: number, isActive: boolean) => {
        return await updateQRCode(id, { is_active: isActive });
    };

    /**
     * Set selected QR code for editing
     */
    const setSelectedQRCode = (qrCode: QRCode | null) => {
        selectedQRCode.value = qrCode;
    };

    return {
        // Config
        quizConfig,

        // State
        qrCodes,
        loading,
        selectedQRCode,

        // Actions
        generateQuizLink,
        fetchQRCodes,
        createQRCode,
        updateQRCode,
        deleteQRCode,
        toggleQRCodeStatus,
        setSelectedQRCode,
    };
});
