"use client";

import { useState } from "react";

export default function ImageUploader({ onUpload }) {
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded * 100) / event.total));
      }
    });

    xhr.onload = () => {
      setUploading(false);
      const res = JSON.parse(xhr.responseText);
      if (res.secure_url && onUpload) onUpload(res.secure_url);
    };

    xhr.send(formData);
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-gray-600">Upload Image</label>

      <input
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="w-full form-input"
      />

      {preview && (
        <img
          src={preview}
          alt="Preview"
          className="w-32 h-32 object-cover rounded border shadow-sm"
        />
      )}

      {uploading && (
        <div className="w-full bg-gray-200 h-2 rounded">
          <div
            className="bg-purple-600 h-2 rounded"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
}
