import React from 'react';

// Data for the resource cards
const items = [
  {
    title: 'Mastering Mindfulness',
    type: 'Article',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&h=200&q=80',
    description: 'Learn practical mindfulness techniques for daily life'
  },
  {
    title: 'Effective Time Management',
    type: 'Video',
    image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=200&fit=crop&crop=center',
    description: 'Strategies to maximize productivity and reduce stress'
  },
  {
    title: 'Building Resilience',
    type: 'PDF',
    image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=200&fit=crop&crop=center',
    description: 'Develop mental strength and bounce back from challenges'
  },
  {
    title: 'Healthy Eating Habits',
    type: 'Article',
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=200&fit=crop&crop=center',
    description: 'Nutrition tips for better mental and physical health'
  },
  {
    title: 'Financial Planning Basics',
    type: 'Video',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=200&fit=crop&crop=center',
    description: 'Take control of your finances and reduce money stress'
  },
  {
    title: 'Positive Psychology',
    type: 'PDF',
    image: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&h=200&fit=crop&crop=center',
    description: 'Science-based approaches to happiness and well-being'
  },
  {
    title: 'Effective Communication',
    type: 'Article',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop&crop=center',
    description: 'Improve relationships through better communication'
  },
  {
    title: 'Goal Setting Workshop',
    type: 'Video',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop&crop=center',
    description: 'Set and achieve meaningful personal and professional goals'
  },
  {
    title: 'Stress Reduction Techniques',
    type: 'PDF',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=200&fit=crop&crop=center',
    description: 'Proven methods to manage and reduce daily stress'
  }
];

// Reusable Card component with detailed styling
function Card({ item }) {
  const getTypeIcon = (type) => {
    switch (type) {
      case 'Video':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
        );
      case 'PDF':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Video': return 'bg-red-100 text-red-800';
      case 'PDF': return 'bg-blue-100 text-blue-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-xl transition-shadow duration-200 overflow-hidden flex flex-col group">
      <div className="relative h-48 overflow-hidden">
        <img
          src={item.image}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          onError={(e) => {
            e.target.src = `https://via.placeholder.com/400x200/6366f1/ffffff?text=${encodeURIComponent(item.title)}`;
          }}
        />
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
            {getTypeIcon(item.type)}
            {item.type}
          </span>
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-gray-900 font-semibold text-lg mb-2">{item.title}</h3>
        <p className="text-sm text-gray-600 flex-1">{item.description}</p>
        <div className="mt-4 pt-4">
          <button className="w-full bg-blue-600 text-white rounded-md py-2 hover:bg-blue-700 transition-colors duration-200 font-medium">
            View {item.type}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Resources page component
function Resources() {
  return (
    <div className="container-responsive py-8 ml-12 mr-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Self-Help Resources</h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Explore our curated collection of articles, videos, and guides designed to support your mental health and well-being journey.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Filter by type:</span>
          <select className="p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="all">All Resources</option>
            <option value="article">Articles</option>
            <option value="video">Videos</option>
            <option value="pdf">PDFs</option>
          </select>
        </div>
        <div className="text-sm text-gray-500">
          {items.length} resources available
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(item => <Card key={item.title} item={item} />)}
      </div>

      <div className="mt-12 text-center">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Need More Support?</h3>
          <p className="text-gray-600 mb-4">
            Our professional therapists are here to provide personalized guidance and support.
          </p>
          <a
            href="/therapists"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium"
          >
            Find a Therapist
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

export default Resources;