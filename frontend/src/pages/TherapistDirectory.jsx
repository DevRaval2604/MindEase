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
      <div className="text-center text-xs text-gray-600 mt-1">{t.email}</div>
      {t.phone && (
        <div className="text-center text-xs text-gray-500 mt-1">📞 {t.phone}</div>
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

  // Fetch therapists from database
  useEffect(() => {
    const fetchTherapists = async () => {
      if (!isAuthenticated) {
        setLoadingTherapists(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/therapists/`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        
        if (res.ok) {
          const data = await res.json();
          // Transform database format to match component expectations
          const transformed = Array.isArray(data) ? data.map(t => ({
            id: t.id,
            name: t.full_name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Therapist',
            email: t.email,
            phone: t.phone,
            image: t.profile_picture || '',
          })) : [];
          setTherapists(transformed);
        } else {
          console.error('Failed to fetch therapists');
          setTherapists([]);
        }
      } catch (error) {
        console.error('Error fetching therapists:', error);
        setTherapists([]);
      } finally {
        setLoadingTherapists(false);
      }
    };

    fetchTherapists();
  }, [isAuthenticated]);

  const filtered = useMemo(() => {
    return therapists.filter(t => {
      const q = query.trim().toLowerCase();
      return !q || t.name.toLowerCase().includes(q) || (t.email && t.email.toLowerCase().includes(q));
    });
  }, [therapists, query]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4">
        <div className="font-semibold text-gray-900 text-xl">Available Therapists</div>
      </div>

      <div className="mt-4">
        <input
          placeholder="Search therapists by name or email..."
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