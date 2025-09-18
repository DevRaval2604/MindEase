import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Correct data structure for therapists
export const therapists = [
  { name: 'Dr. Dipti Yadav', price: 1800, tags: ['Anxiety', 'Stress Management', 'CBT'], image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=256&h=256&fit=crop&crop=faces' },
  { name: 'Dr. Sahebeet Kaur', price: 1650, tags: ['Depression', 'Trauma'], image: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=256&h=256&fit=crop&crop=faces' },
  { name: 'Dr. Lizu Kaur', price: 1200, tags: ['Relationship Counselling', 'Family Therapy'], image: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=256&h=256&fit=crop&crop=faces' },
  { name: 'Nidhi Rane', price: 1500, tags: ['Child & Adolescent Therapy', 'Parenting Support'], image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&h=256&fit=crop&crop=faces' },
  { name: 'Aditi Shah', price: 1900, tags: ['Addiction Recovery', 'Group Therapy'], image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=256&h=256&fit=crop&crop=faces' },
  { name: 'Anis Syed', price: 1700, tags: ['Eating Disorders', 'Self-Esteem'], image: 'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=256&h=256&fit=crop&crop=faces' }
];

// Helper function to format currency
const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

// Therapist Card component with real images
function TherapistCard({ t, onBook }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex flex-col">
      <div className="mx-auto w-20 h-20 rounded-full overflow-hidden mb-4 ring-2 ring-white shadow">
        <img
          src={t.image}
          alt={t.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = 'https://via.placeholder.com/160x160/94a3b8/ffffff?text=Therapist';
          }}
        />
      </div>
      <div className="text-center font-semibold text-gray-900">{t.name}</div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {t.tags.map(tag => (
          <span key={tag} className="text-[11px] px-2 py-1 rounded-full bg-blue-50 text-blue-700">{tag}</span>
        ))}
      </div>
      <div className="mt-4 text-center text-sm text-gray-900">
        <span className="align-middle font-semibold">{formatINR(t.price)}</span>
        <span className="align-middle text-xs text-gray-600 ml-1">per session</span>
      </div>
      <button onClick={onBook} className="mt-4 bg-blue-600 text-white rounded-md py-2 hover:bg-blue-700">Book Now</button>
    </div>
  );
}

// Main Therapist Directory component with filtering logic
function TherapistDirectory() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [specialization, setSpecialization] = useState('all');
  const [priceRange, setPriceRange] = useState('all');

  const specializations = useMemo(() => {
    const all = new Set();
    therapists.forEach(t => t.tags.forEach(tag => all.add(tag)));
    return ['all', ...Array.from(all)];
  }, []);

  const filtered = useMemo(() => {
    return therapists.filter(t => {
      const matchesQuery = query.trim().length === 0 || t.name.toLowerCase().includes(query.toLowerCase());
      const matchesSpec = specialization === 'all' || t.tags.includes(specialization);
      const matchesPrice = (() => {
        if (priceRange === 'all') return true;
        if (priceRange === 'lt1500') return t.price < 1500;
        if (priceRange === '1500to1800') return t.price >= 1500 && t.price <= 1800;
        if (priceRange === 'gt1800') return t.price > 1800;
        return true;
      })();
      return matchesQuery && matchesSpec && matchesPrice;
    });
  }, [query, specialization, priceRange]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4">
        <div className="font-semibold text-gray-900 text-xl">Available Therapists</div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          placeholder="Search therapists by name..."
          className="p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={specialization}
          onChange={(e) => setSpecialization(e.target.value)}
        >
          {specializations.map(spec => (
            <option key={spec} value={spec}>{spec === 'all' ? 'All specializations' : spec}</option>
          ))}
        </select>
        <select
          className="p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={priceRange}
          onChange={(e) => setPriceRange(e.target.value)}
        >
          <option value="all">All price ranges</option>
          <option value="lt1500">Below ₹1,500</option>
          <option value="1500to1800">₹1,500 – ₹1,800</option>
          <option value="gt1800">Above ₹1,800</option>
        </select>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(t => (
          <TherapistCard
            key={t.name}
            t={t}
            onBook={() => navigate('/appointments/book', { state: { therapist: t } })}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-8 text-sm text-gray-600 text-center py-10">
          No therapists match your filters. Try clearing some filters to see more options.
        </div>
      )}
    </div>
  );
}

export default TherapistDirectory;