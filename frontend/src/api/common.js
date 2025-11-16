const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

// Fetch Specializations
export async function fetchSpecializations() {
  const res = await fetch(`${API_BASE}/api/search/specializations/`);
  if (!res.ok) throw new Error("Failed to load specializations");
  return res.json();
}

// Fetch Availability options
export async function fetchAvailability() {
  const res = await fetch(`${API_BASE}/api/search/availability/`);
  if (!res.ok) throw new Error("Failed to load availability");
  return res.json();
}
