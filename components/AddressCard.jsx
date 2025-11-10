"use client";

export default function AddressCard({ addr, selected, onSelect }) {
  return (
    <div
      onClick={() => onSelect(addr)}
      className={`border rounded-xl p-4 cursor-pointer transition-all ${
        selected ? "border-purple-600 bg-purple-50 shadow-md" : "border-gray-200 hover:border-purple-300"
      }`}
    >
      <div className="flex justify-between">
        <h4 className="font-semibold text-purple-700">{addr.label || "Address"}</h4>
        {selected && <span className="text-xs text-purple-600 font-medium">Selected</span>}
      </div>
      <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">{addr.address}</p>
      {addr.place && (
        <p className="text-xs text-gray-500 mt-1">
          {addr.place}, {addr.district}, {addr.state} - {addr.pincode}
        </p>
      )}
      <p className="text-xs text-gray-500 mt-1">📞 {addr.mobile || "Not provided"}</p>
      <p className="text-xs text-gray-400 mt-1 italic">
        👤 {addr.name || "Name not set"}
      </p>
    </div>
  );
}
