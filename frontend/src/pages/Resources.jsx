const items = [
  { title: 'Mastering Mindfulness', type: 'Article' },
  { title: 'Effective Time Management', type: 'Video' },
  { title: 'Building Resilience', type: 'PDF' },
  { title: 'Healthy Eating Habits', type: 'Article' },
  { title: 'Financial Planning Basics', type: 'Video' },
  { title: 'Positive Psychology', type: 'PDF' },
  { title: 'Effective Communication', type: 'Article' },
  { title: 'Goal Setting Workshop', type: 'Video' },
  { title: 'Stress Reduction Techniques', type: 'PDF' }
];

function Card({ item }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-xl overflow-hidden flex flex-col">
      <div className="h-36 bg-gray-100" />
      <div className="p-5 flex-1 flex flex-col">
        <div className="text-gray-900 font-semibold">{item.title}</div>
        <p className="text-sm text-gray-600 mt-1">Explore this {item.type.toLowerCase()} to support your wellbeing.</p>
        <div className="mt-auto pt-4">
          <button className="w-full bg-blue-600 text-white rounded-md py-2">View</button>
        </div>
      </div>
    </div>
  );
}

function Resources() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900">Self-Help Resources</h1>
      <p className="text-gray-600 mt-2">Explore our curated collection of articles, videos, and guides designed to support your well-being.</p>

      <div className="mt-4 flex items-center gap-3">
        <div className="ml-auto ">
          <select className="p-2.5 border border-gray-700 border-1 rounded-md w-15 mr-2 pr-2"><option>All</option></select>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 hover:shadow-lg">
        {items.map(i => <Card key={i.title} item={i} />)}
      </div>
    </div>
  );
}

export default Resources;


