function Home() {
  return (
    <div className="">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
            Mental Wellness for Every Age, From Anywhere
          </h1>
          <p className="mt-5 text-gray-600 max-w-xl">
            MindEase provides compassionate, personalized mental health support for individuals and families.
            Discover a path to well-being with our expert therapists and comprehensive resources.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <a href="/appointments/book" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Book a Session</a>
            <a href="/therapists" className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Explore Therapists</a>
            <a href="/resources" className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Self-Help Resources</a>
          </div>
        </div>
        <div className="flex justify-center md:justify-end">
          <div className="w-full max-w-md aspect-video rounded-xl bg-gradient-to-br from-orange-200 via-purple-200 to-cyan-200 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-orange-500/90" />
          </div>
        </div>
      </section>

      <section className="bg-gray-50 border-t border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900">Why Choose MindEase?</h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="font-semibold text-gray-900 mb-2">Compassionate Support</div>
              <p className="text-sm text-gray-600">Our dedicated professionals offer empathetic guidance, fostering a safe space for growth.</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="font-semibold text-gray-900 mb-2">Diverse Expertise</div>
              <p className="text-sm text-gray-600">Connect with therapists across modalities to find the perfect match for your needs.</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="font-semibold text-gray-900 mb-2">Flexible Access</div>
              <p className="text-sm text-gray-600">Get care anytime, anywhere with convenient online sessions tailored to your schedule.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;