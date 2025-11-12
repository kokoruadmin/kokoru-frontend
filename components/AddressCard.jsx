"use client";

import { normalizeAddress, formatAddressInline } from "../utils/addressHelper";

export default function AddressCard({ addr, selected, onSelect, userName }) {
  const a = normalizeAddress(addr);
  const pretty = formatAddressInline(a);

  return (
    <div
      onClick={() => onSelect && onSelect(addr)}
      className={`border rounded-xl p-4 cursor-pointer transition-all ${
        selected ? "border-purple-600 bg-purple-50 shadow-md" : "border-gray-200 hover:border-purple-300"
      }`}
    >
      <div className="flex justify-between">
        <h4 className="font-semibold text-purple-700">{pretty.label || "Address"}</h4>
        {selected && <span className="text-xs text-purple-600 font-medium">Selected</span>}
      </div>
      <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">{pretty.addressLine}</p>
      {pretty.region && (
        <p className="text-xs text-gray-500 mt-1">{pretty.region}{pretty.pincode ? ` - ${pretty.pincode}` : ''}</p>
      )}
      {pretty.landmark ? <p className="text-xs text-gray-500 mt-1">📍 {pretty.landmark}</p> : null}
      <p className="text-xs text-gray-500 mt-1">📞 {pretty.mobile || "Not provided"}{pretty.alternateMobile ? ` • Alt: ${pretty.alternateMobile}` : ''}</p>
      {pretty.email ? <p className="text-xs text-gray-500 mt-1">✉️ {pretty.email}</p> : null}
      <p className="text-xs text-gray-400 mt-1 italic">👤 {pretty.name || userName || "Name not set"}</p>
    </div>
  );
}
