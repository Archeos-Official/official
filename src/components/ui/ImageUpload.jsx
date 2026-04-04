import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, Loader2 } from 'lucide-react';

export default function ImageUpload({ onImageUploaded, darkMode }) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(null);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const handleUpload = async (file) => {
        if (!file) return;
        setUploading(true);
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        // Pass the file object directly
        onImageUploaded(file);
        setUploading(false);
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
    };

    const clearImage = () => {
        setPreview(null);
        onImageUploaded(null);
    };

    return (
        <div>
            {preview ? (
                <div className={`relative rounded-2xl overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-[#f4d0a8]'}`}>
                    <img src={preview} alt="Preview" className="w-full h-64 object-cover" />
                    {uploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                    )}
                    {!uploading && (
                        <button onClick={clearImage} className="absolute top-3 right-3 p-2 bg-black/50 rounded-full hover:bg-black/70">
                            <X className="w-4 h-4 text-white" />
                        </button>
                    )}
                </div>
            ) : (
                <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${darkMode ? 'border-gray-600 hover:border-[#b66c34] bg-gray-700/50' : 'border-[#c98a54] hover:border-[#b66c34] bg-[#f4d0a8]/20'}`}>
                    <div className="flex flex-col items-center gap-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-600' : 'bg-[#f4d0a8]'}`}>
                            <Camera className="w-8 h-8 text-[#b66c34]" />
                        </div>
                        <div>
                            <p className={`font-medium ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>Capture your discovery</p>
                            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}`}>Take a photo or upload an image</p>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => cameraInputRef.current?.click()} className={`rounded-xl ${darkMode ? 'border-gray-600 text-white hover:bg-gray-700' : 'border-[#b66c34] text-[#b66c34] hover:bg-[#f4d0a8]'}`}>
                                <Camera className="w-4 h-4 mr-2" />Camera
                            </Button>
                            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className={`rounded-xl ${darkMode ? 'border-gray-600 text-white hover:bg-gray-700' : 'border-[#b66c34] text-[#b66c34] hover:bg-[#f4d0a8]'}`}>
                                <Upload className="w-4 h-4 mr-2" />Upload
                            </Button>
                        </div>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
                </div>
            )}
        </div>
    );
}