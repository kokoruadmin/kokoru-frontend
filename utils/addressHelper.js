// Normalize address input into a consistent object shape for display and forms
function parseDefaultAddressString(str) {
  if (!str) return {};
  const txt = String(str).trim();
  const lines = txt.split(/\r?\n|,\s*/).map((l) => l.trim()).filter(Boolean);
  // try to find pincode
  const pinMatch = txt.match(/Pincode:\s*(\d{6})/i) || txt.match(/(\d{6})$/);
  const pincode = pinMatch ? pinMatch[1] : "";
  const addressLines = lines.filter((l) => !/Pincode:/i.test(l) && !/\d{6}$/.test(l));
  // try to find mobile / alternate / email / landmark hints
  let mobile = "";
  let alternateMobile = "";
  let email = "";
  let landmark = "";
  let name = "";
  for (const l of lines) {
    const m = l.match(/(Mobile|Phone|Contact|Tel)[:\s]*([0-9\-+ ]{6,})/i);
    if (m && !mobile) mobile = String(m[2]).replace(/\D/g, '').slice(-10);
    const am = l.match(/(Alternate|Alt|Alt\.? Mobile|Alternate Mobile)[:\s]*([0-9\-+ ]{6,})/i);
    if (am && !alternateMobile) alternateMobile = String(am[2]).replace(/\D/g, '').slice(-10);
    const em = l.match(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
    if (em && !email) email = em[1];
    if (/Landmark[:\s]/i.test(l) && !landmark) landmark = l.replace(/Landmark[:\s]/i, '').trim();
    // naive name detection: if line contains letters and spaces and no digits and appears first
    if (!name && /^[A-Za-z\s\.]{2,}$/.test(l) && !/\b(Address|Pincode|Pin|Mobile|Phone|Contact|Landmark|Email)\b/i.test(l)) {
      name = l;
    }
  }
  return {
    address: addressLines.join(" ") || txt,
    pincode: pincode || "",
    place: "",
    district: "",
    state: "",
    mobile: mobile || "",
    alternateMobile: alternateMobile || "",
    landmark: landmark || "",
    email: email || "",
    name: name || "",
    label: "Default",
  };
}

export function normalizeAddress(addr) {
  if (!addr) return { address: "", pincode: "", place: "", district: "", state: "", mobile: "", name: "", label: "" };
  if (typeof addr === "string") return parseDefaultAddressString(addr);
  // if it's an object, ensure fields exist
  const a = addr || {};
  return {
    address: a.address || a.addressText || "",
    pincode: a.pincode || a.pin || "",
    place: a.place || "",
    district: a.district || "",
    state: a.state || "",
    mobile: a.mobile || a.contact || "",
    alternateMobile: a.alternateMobile || a.mobile2 || "",
    landmark: a.landmark || "",
    email: a.email || "",
    name: a.name || "",
    label: a.label || "",
  };
}

export function formatAddressInline(addr) {
  const a = normalizeAddress(addr);
  const parts = [];
  if (a.place) parts.push(a.place);
  if (a.district) parts.push(a.district);
  if (a.state) parts.push(a.state);
  const region = parts.join(" • ");
  return { addressLine: a.address || "", region, pincode: a.pincode || "", mobile: a.mobile || "", alternateMobile: a.alternateMobile || "", landmark: a.landmark || "", email: a.email || "", name: a.name || "", label: a.label || "" };
}

export default {
  normalizeAddress,
  formatAddressInline,
};
