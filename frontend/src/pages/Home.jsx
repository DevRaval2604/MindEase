function Home() {
  return (
    <div className="">
      <section className="container-responsive pt-16 pb-12 pl-12 pr-12 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
            Mental Wellness for Every Age, From Anywhere
          </h1>
          <p className="mt-5 text-gray-600 max-w-xl">
            MindEase provides compassionate, personalized mental health support for individuals and families.
            Discover a path to well-being with our expert therapists and comprehensive resources.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row sm:flex-wrap gap-3 text-sm w-full">
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

      <section className="bg-gray-50 border-t border-b border-gray-200 pl-10 pr-10">
        <div className="container-responsive py-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900">Why Choose MindEase?</h2>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
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

      {/* How it works */}
      <section className="container-responsive py-12 pl-10 pr-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900">How It Works</h2>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="w-10 h-10 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">1</div>
            <div className="mt-3 font-semibold text-gray-900">Tell us your needs</div>
            <p className="text-sm text-gray-600">Answer a few questions so we can understand your goals and preferences.</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="w-10 h-10 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">2</div>
            <div className="mt-3 font-semibold text-gray-900">Match with therapists</div>
            <p className="text-sm text-gray-600">Browse recommended professionals and compare profiles, experience, and fees.</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="w-10 h-10 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">3</div>
            <div className="mt-3 font-semibold text-gray-900">Book and begin</div>
            <p className="text-sm text-gray-600">Choose a convenient slot and start your journey—online or in person.</p>
          </div>
        </div>
      </section>

      {/* Featured therapists teaser */}
      <section className="bg-white border-t border-b border-gray-200 pl-10 pr-10">
        <div className="container-responsive py-12">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Featured Therapists</h2>
            <a href="/therapists" className="text-sm text-blue-600 hover:text-blue-700">View all</a>
          </div>
          <div className="mt-6 text-sm text-gray-600 text-center py-10">
            <a href="/therapists" className="text-blue-600 hover:text-blue-700 underline">Explore our available therapists</a>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container-responsive py-12 pl-10 pr-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900">What Clients Say</h2>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {["MindEase helped me find the right therapist within a day.",
            "Booking sessions that fit my schedule has been effortless.",
            "I feel heard, supported, and more in control of my wellbeing."].map((quote, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-6">
                <p className="text-gray-700">“{quote}”</p>
                <div className="mt-4 text-sm text-gray-500">— Client #{i + 1}</div>
              </div>
            ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-blue-600">
        <div className="container-responsive py-12 text-center text-white">
          <h3 className="text-2xl font-bold">Ready to begin?</h3>
          <p className="mt-2 text-blue-100">Start your journey to better mental health today.</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/appointments/book" className="inline-flex items-center justify-center bg-white text-blue-700 px-5 py-2 rounded-md hover:bg-blue-50">Book a Session</a>
            <a href="/therapists" className="inline-flex items-center justify-center border border-white/70 px-5 py-2 rounded-md hover:bg-white/10">Explore Therapists</a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;