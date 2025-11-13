import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// Therapist Card component
function TherapistCard({ t, onBook }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex flex-col">
      <div className="mx-auto w-20 h-20 rounded-full overflow-hidden mb-4 ring-2 ring-white shadow bg-gradient-to-br from-blue-400 to-purple-500">
        {t.image ? (
          <img
            src={t.image}
            alt={t.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div className={`w-full h-full flex items-center justify-center text-white text-2xl font-semibold ${t.image ? 'hidden' : ''}`}>
          {(t.name?.[0] || t.email?.[0] || 'T').toUpperCase()}
        </div>
      </div>
      <div className="text-center font-semibold text-gray-900">{t.name}</div>
      {t.specializations && t.specializations.length > 0 && (
        <div className="text-center text-xs text-gray-600 mt-1">
          {t.specializations.map(s => s.name || s).join(', ')}
        </div>
      )}
      {t.fees && (
        <div className="text-center text-sm text-gray-700 mt-2 font-medium">
          ₹{parseFloat(t.fees).toLocaleString('en-IN')} per session
        </div>
      )}
      <button onClick={onBook} className="mt-4 bg-blue-600 text-white rounded-md py-2 hover:bg-blue-700">Book Now</button>
    </div>
  );
}

// Main Therapist Directory component with filtering logic
function TherapistDirectory() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const [therapists, setTherapists] = useState([]);
  const [loadingTherapists, setLoadingTherapists] = useState(true);

  // Fetch counsellors from backend API (public endpoint, no auth required)
  useEffect(() => {
    const fetchTherapists = async () => {
      setLoadingTherapists(true);
      try {
        // Use search API with query params for filtering
        const params = new URLSearchParams();
        if (query.trim()) {
          params.append('q', query.trim());
        }

        const res = await fetch(`${API_BASE}/api/search/counsellors/?${params.toString()}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          // Backend returns paginated response: { results: [...], count, next, previous }
          const counsellors = data.results || data || [];

          // Transform backend format to match component expectations
          const transformed = Array.isArray(counsellors) ? counsellors.map(t => ({
            id: t.id,
            name: t.full_name || 'Counsellor',
            email: t.user?.email || '',
            phone: t.user?.phone || '',
            image: t.profile_picture || '',
            specializations: t.specializations || [],
            fees: t.fees_per_session || 0,
            experience: t.experience || '',
            availability: t.availability || [],
          })) : [];
          setTherapists(transformed);
        } else {
          console.error('Failed to fetch counsellors');
          setTherapists([]);
        }
      } catch (error) {
        console.error('Error fetching counsellors:', error);
        setTherapists([]);
      } finally {
        setLoadingTherapists(false);
      }
    };

    fetchTherapists();
  }, [query]); // Re-fetch when query changes

  // No need for client-side filtering since API handles it
  const filtered = therapists;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4">
        <div className="font-semibold text-gray-900 text-xl">Available Therapists</div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-4">
        <input
          placeholder="Search counsellors by name or email..."
          className="w-full sm:w-96 p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loadingTherapists ? (
        <div className="mt-8 text-sm text-gray-600 text-center py-10">Loading therapists...</div>
      ) : therapists.length === 0 ? (
        <div className="mt-8 text-sm text-gray-600 text-center py-10">No therapists available at the moment.</div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(t => (
              <TherapistCard
                key={t.id}
                t={t}
                onBook={() => navigate('/appointments/book', { state: { therapist: t } })}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="mt-8 text-sm text-gray-600 text-center py-10">
              No therapists match your search. Try adjusting your search terms.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TherapistDirectory;