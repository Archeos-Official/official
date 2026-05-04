import { supabase } from './supabaseClient';

const STORAGE_BUCKET = 'discoveries';

export const compressImage = async (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                }, 'image/jpeg', quality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
};

export const uploadImage = async (file, userId) => {
    // Compress image if it's large
    let fileToUpload = file;
    if (file.size > 500000) { // 500KB
        fileToUpload = await compressImage(file);
    }
    
    const fileExt = fileToUpload.name.split('.').pop();
    const fileName = `${userId || 'anonymous'}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    
    console.log('=== F12 DEBUG: Supabase Storage Upload ===');
    console.log('Bucket:', STORAGE_BUCKET);
    console.log('File name:', fileName);
    console.log('File size:', fileToUpload.size);
    console.log('User ID:', userId || 'anonymous');
    
    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, fileToUpload, {
            cacheControl: '3600',
            upsert: false
        });
    
    if (error) {
        console.error('Supabase upload error:', error);
        console.error('Error message:', error.message);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw new Error(`Storage upload failed: ${error.message}`);
    }
    
    console.log('Upload success, path:', data.path);
    
    const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(data.path);
    
    console.log('Public URL:', urlData.publicUrl);
    console.log('=== END DEBUG ===');
    
    const publicUrl = urlData.publicUrl.includes('/public/') 
        ? urlData.publicUrl 
        : urlData.publicUrl.replace('/storage/v1/object/', '/storage/v1/object/public/');
    
    return publicUrl;
};

export const deleteImage = async (imageUrl) => {
    const path = imageUrl.split(`${STORAGE_BUCKET}/`)[1];
    if (!path) return;
    
    const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([path]);
    
    if (error) console.error('Failed to delete image:', error);
};

export const uploadImages = async (files, userId) => {
    return Promise.all(
        files.map(file => uploadImage(file, userId))
    );
};
