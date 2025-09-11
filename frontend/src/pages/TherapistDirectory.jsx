export const therapists = [
  { name: 'Dr. Dipti Yadav', price: '1800/session', tags: ['Anxiety', 'Stress Management', 'CBT'], color: 'from-fuchsia-500 to-pink-500' },
  { name: 'Dr. Sahebeet Kaur', price: '1650/session', tags: ['Depression', 'Trauma'], color: 'from-orange-500 to-amber-500' },
  { name: 'Dr. Lizu Kaur', price: '1200/session', tags: ['Relationship Counselling', 'Family Therapy'], color: 'from-violet-500 to-purple-600' },
  { name: 'Nidhi Rane', price: '1500/session', tags: ['Child & Adolescent Therapy', 'Parenting Support'], color: 'from-green-500 to-lime-500' },
  { name: 'Aditi Shah', price: '1900/session', tags: ['Addiction Recovery', 'Group Therapy'], color: 'from-cyan-500 to-sky-500' },
  { name: 'Anis Syed', price: '1700/session', tags: ['Eating Disorders', 'Self-Esteem'], color: 'from-purple-500 to-fuchsia-600' }
];

import { useNavigate } from 'react-router-dom';

function TherapistCard({ t, onBook }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex flex-col">
      <div className={`mx-auto w-20 h-20 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-3xl mb-4`}>👤</div>
      <div className="text-center font-semibold text-gray-900">{t.name}</div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {t.tags.map(tag => (
          <span key={tag} className="text-[11px] px-2 py-1 rounded-full bg-purple-100 text-purple-700">{tag}</span>
        ))}
      </div>
      <div className="mt-4 text-center text-sm text-gray-700">{t.price}</div>
      <button onClick={onBook} className="mt-4 bg-blue-600 text-white rounded-md py-2 hover:bg-blue-700">Book Now</button>
    </div>
  );
}

function TherapistDirectory() {
  const navigate = useNavigate();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4">
        <div className="font-semibold text-gray-900 text-xl">Available Therapists</div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <input placeholder="Search therapists..." className="w-full md:w-96 p-2.5 border border-gray-500 border-1.5 rounded-md w-15 mr-2 pr-2" />
        <select className="p-2.5 border rounded-md"><option>Specialization</option></select>
        <select className="p-2.5 border rounded-md"><option>Price Range</option></select>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {therapists.map(t => (
          <TherapistCard
            key={t.name}
            t={t}
            onBook={() => navigate('/appointments/book', { state: { therapist: t } })}
          />
        ))}
      </div>
    </div>
  );
}

export default TherapistDirectory;


