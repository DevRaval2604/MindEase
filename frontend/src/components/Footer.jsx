function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="text-lg font-semibold text-gray-900">MindEase</div>
            <p className="mt-3 text-sm text-gray-600">Compassionate, personalized mental health support for individuals and families.</p>
            <p className="mt-3 text-sm text-gray-500">CIN: ME-2024-WS-SOA • GST: 27ABCDE1234F1Z5</p>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Quick Links</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a className="text-gray-600 hover:text-gray-900" href="/therapists">Therapists</a></li>
              <li><a className="text-gray-600 hover:text-gray-900" href="/appointments/book">Book a Session</a></li>
              <li><a className="text-gray-600 hover:text-gray-900" href="/resources">Resources</a></li>
              <li><a className="text-gray-600 hover:text-gray-900" href="/login">Login</a></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Contact</div>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>Email: support@mindease.example</li>
              <li>Phone: +91 98765 43210</li>
              <li>Address: 221B Wellness Street, Pune, MH 411001</li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Follow Us</div>
            <div className="mt-3 flex gap-4">
              <a 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 transition-colors duration-200 group" 
                href="#"
                title="Follow us on Twitter"
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
              <a 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all duration-200 group" 
                href="#"
                title="Follow us on Instagram"
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-sm text-gray-500">© {year} MindEase. All rights reserved.</div>
          <div className="text-xs text-gray-500 space-x-4">
            <a className="hover:text-gray-700" href="#">Terms</a>
            <a className="hover:text-gray-700" href="#">Privacy</a>
            <a className="hover:text-gray-700" href="#">Help</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;


