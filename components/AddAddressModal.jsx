"use client";
import { useState, useRef } from "react";
import { normalizeAddress } from "../utils/addressHelper";
import AddressForm from "./AddressForm";

export default function AddAddressModal({ open, onClose, onSave, initialData = null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef(null);

  if (!open) return null;

  const handleSave = async () => {
    setError("");
    if (!formRef.current || !formRef.current.submit) return;
    try {
      setLoading(true);
      // AddressForm.submit will call the onSave prop we pass to it
      await formRef.current.submit();
      setLoading(false);
      onClose();
    } catch (err) {
      console.error(err);
      setLoading(false);
      setError(err?.message || "Failed to save address");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md text-gray-800">
        <div className="max-h-[80vh] overflow-auto p-6 space-y-4">
          <h3 className="text-lg font-semibold text-purple-700">Add / Edit Address</h3>

          <AddressForm ref={formRef} initial={initialData} hideButtons={true} onSave={onSave} />

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t p-4">
          <div className="text-sm text-gray-600">Tip: Add an alternate mobile and landmark for precise delivery.</div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onClose()} disabled={loading} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md">Cancel</button>
            <button type="button" onClick={handleSave} disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded-md">
              {loading ? 'Saving...' : 'Save Address'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
