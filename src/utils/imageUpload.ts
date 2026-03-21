import { supabase } from '@/lib/supabase';

/**
 * Upload image to Supabase storage
 */
export const uploadImageToStorage = async (
  file: File | Blob,
  bucket: string = 'student-answers',
  folder: string = 'answers'
): Promise<string> => {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file instanceof File ? file.name.split('.').pop() : 'jpg';
    const fileName = `${folder}/${timestamp}-${randomString}.${extension}`;

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return urlData.publicUrl;

  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

/**
 * Delete image from storage
 */
export const deleteImageFromStorage = async (
  imageUrl: string,
  bucket: string = 'student-answers'
): Promise<void> => {
  try {
    // Extract file path from URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts.slice(-2).join('/'); // Get folder/filename

    const { error } = await supabase.storage
      .from(bucket)
      .remove([fileName]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }

  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};
