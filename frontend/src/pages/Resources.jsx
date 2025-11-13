import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// Reusable Card component with detailed styling
function Card({ item }) {
  const getTypeIcon = (type) => {
    const typeLower = type?.toLowerCase();
    switch (typeLower) {
      case 'video':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
        );
      case 'pdf':
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
    const typeLower = type?.toLowerCase();
    switch (typeLower) {
      case 'video': return 'bg-red-100 text-red-800';
      case 'pdf': return 'bg-blue-100 text-blue-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const getTypeLabel = (type) => {
    const typeLower = type?.toLowerCase();
    switch (typeLower) {
      case 'video': return 'Video';
      case 'pdf': return 'PDF';
      default: return 'Article';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-xl transition-shadow duration-200 overflow-hidden flex flex-col group">
      <div className="relative h-48 overflow-hidden">
        <img
          src={item.thumbnail_url || `https://via.placeholder.com/400x200/6366f1/ffffff?text=${encodeURIComponent(item.title)}`}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          onError={(e) => {
            e.target.src = `https://via.placeholder.com/400x200/6366f1/ffffff?text=${encodeURIComponent(item.title)}`;
          }}
        />
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(item.resource_type)}`}>
            {getTypeIcon(item.resource_type)}
            {getTypeLabel(item.resource_type)}
          </span>
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-gray-900 font-semibold text-lg mb-2">{item.title}</h3>
        <p className="text-sm text-gray-600 flex-1">{item.description}</p>
        <div className="mt-4 pt-4">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-blue-600 text-white rounded-md py-2 hover:bg-blue-700 transition-colors duration-200 font-medium text-center block"
          >
            View {getTypeLabel(item.resource_type)}
          </a>
        </div>
      </div>
    </div>
  );
}

// Main Resources page component
function Resources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch resources from backend API
  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) {
          params.append('q', searchQuery.trim());
        }
        if (filterType !== 'all') {
          params.append('type', filterType);
        }

        const res = await fetch(`${API_BASE}/api/resources/?${params.toString()}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          // Backend returns paginated response: { results: [...], count, next, previous }
          const resourcesList = data.results || data || [];
          setResources(resourcesList);
        } else {
          console.error('Failed to fetch resources');
          setResources([]);
        }
      } catch (error) {
        console.error('Error fetching resources:', error);
        setResources([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [filterType, searchQuery]);

  return (
    <div className="container-responsive py-8 ml-12 mr-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Self-Help Resources</h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Explore our curated collection of articles, videos, and guides designed to support your mental health and well-being journey.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4 flex-1">
          <input
            type="text"
            placeholder="Search resources..."
            className="flex-1 p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <select
            className="p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Resources</option>
            <option value="article">Articles</option>
            <option value="video">Videos</option>
            <option value="pdf">PDFs</option>
          </select>
        </div>
        <div className="text-sm text-gray-500">
          {resources.length} resources available
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-600">Loading resources...</div>
      ) : resources.length === 0 ? (
        <div className="text-center py-10 text-gray-600">No resources found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map(item => (
            <Card key={item.id} item={item} />
          ))}
        </div>
      )}

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