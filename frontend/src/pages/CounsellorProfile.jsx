import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

function Label({ children }) {
  return <div className="text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">{children}</div>;
}

function CounsellorProfile() {
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    licenseNumber: '',
    specialization: '',
    fees: '',
    availability: '',
    bio: '',
    avatar: '',
  });

  // Fetch user profile from database
  useEffect(() => {
    const fetchProfile = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/profile/`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          console.log('CounsellorProfile: Loaded data from database:', data);

          // Get database fields - ensure all fields are properly extracted
          const dbFullName = `${(data.first_name || '').trim()} ${(data.last_name || '').trim()}`.trim();
          const dbEmail = data.email || '';
          const dbPhone = data.phone || '';
          const dbAvatar = data.profile_picture || '';
          const dbLicenseNumber = data.license_number || '';
          const dbFees = data.fees_per_session || '';
          const dbBio = data.bio || '';
          const dbExperience = data.experience || '';

          // Handle specializations - backend returns array of objects with id and name
          let specializationName = '';
          if (data.specializations && data.specializations.length > 0) {
            // If it's an array of objects, get the first one's name
            if (typeof data.specializations[0] === 'object' && data.specializations[0].name) {
              specializationName = data.specializations[0].name;
            } else if (typeof data.specializations[0] === 'string') {
              specializationName = data.specializations[0];
            }
          }

          // Handle availability - backend returns array of objects with id and name
          let availabilityName = '';
          if (data.availability && data.availability.length > 0) {
            // If it's an array of objects, get the first one's name
            if (typeof data.availability[0] === 'object' && data.availability[0].name) {
              availabilityName = data.availability[0].name;
            } else if (typeof data.availability[0] === 'string') {
              availabilityName = data.availability[0];
            }
          }

          // Set profile with database data
          setProfile({
            fullName: dbFullName,
            email: dbEmail,
            phone: dbPhone,
            avatar: dbAvatar,
            licenseNumber: dbLicenseNumber,
            specialization: specializationName,
            fees: dbFees ? String(dbFees) : '',
            availability: availabilityName,
            bio: dbBio || dbExperience,
          });

          console.log('CounsellorProfile: Profile set with database data:', {
            fullName: dbFullName,
            email: dbEmail,
            phone: dbPhone,
            avatar: dbAvatar
          });
        } else {
          const errorText = await res.text();
          console.error('Failed to fetch profile. Status:', res.status, 'Response:', errorText);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated]);

  function handleChange(e) {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setProfile(prev => ({ ...prev, avatar: reader.result }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSave(e) {
    e.preventDefault();

    if (!isAuthenticated) {
      alert('Please login to save your profile');
      return;
    }

    try {
      // Prepare update data according to backend serializer
      const nameParts = profile.fullName.trim().split(' ');
      const updateData = {
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        phone: profile.phone || '',
        profile_picture: profile.avatar || '',
        bio: profile.bio || '',
        license_number: profile.licenseNumber || '',
        fees_per_session: profile.fees ? parseFloat(profile.fees) : null,
        experience: profile.bio || '', // Using bio as experience for now
      };

      // Map specialization name to ID (matching Register.jsx mapping)
      const specializationMap = {
        'Anxiety': 1,
        'Depression': 2,
        'Relationship Counselling': 3,
      };
      if (profile.specialization && specializationMap[profile.specialization]) {
        updateData.specializations = [specializationMap[profile.specialization]];
      }

      // Map availability name to ID (matching Register.jsx mapping)
      const availabilityMap = {
        'Weekdays': 2,
        'Weekends': 1,
        'Evenings': 3,
      };
      // Handle availability string formats
      let availabilityKey = profile.availability;
      if (availabilityKey) {
        // Remove parentheses content if present (e.g., "Weekdays (9 AM - 5 PM)" -> "Weekdays")
        availabilityKey = availabilityKey.split('(')[0].trim();
        if (availabilityMap[availabilityKey]) {
          updateData.availability = [availabilityMap[availabilityKey]];
        }
      }

      const res = await fetch(`${API_BASE}/api/auth/profile/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        const updatedData = await res.json();
        console.log('Profile updated in database:', updatedData);

        // Update local state with returned data
        const nameParts = [updatedData.first_name || '', updatedData.last_name || ''].filter(Boolean);
        let specializationName = '';
        if (updatedData.specializations && updatedData.specializations.length > 0) {
          if (typeof updatedData.specializations[0] === 'object' && updatedData.specializations[0].name) {
            specializationName = updatedData.specializations[0].name;
          }
        }
        let availabilityName = '';
        if (updatedData.availability && updatedData.availability.length > 0) {
          if (typeof updatedData.availability[0] === 'object' && updatedData.availability[0].name) {
            availabilityName = updatedData.availability[0].name;
          }
        }

        setProfile(prev => ({
          ...prev,
          fullName: nameParts.join(' ') || prev.fullName,
          phone: updatedData.phone || prev.phone,
          avatar: updatedData.profile_picture || prev.avatar,
          licenseNumber: updatedData.license_number || prev.licenseNumber,
          specialization: specializationName || prev.specialization,
          fees: updatedData.fees_per_session ? String(updatedData.fees_per_session) : prev.fees,
          availability: availabilityName || prev.availability,
          bio: updatedData.bio || updatedData.experience || prev.bio,
        }));

        alert('Profile saved successfully');
      } else {
        const errorData = await res.json();
        console.error('Failed to update profile:', errorData);
        alert('Failed to save profile. Please try again.');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-gray-600">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Settings</h1>
          <p className="text-gray-600">Manage your professional information and credentials</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center h-fit">
              <div className="relative inline-block">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 overflow-hidden mx-auto shadow-lg">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-white">👨‍⚕️</div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-xl font-semibold text-gray-900">{profile.fullName || 'Your Name'}</h3>
                <p className="text-gray-600 mt-1">{profile.email || 'you@example.com'}</p>
                {profile.specialization && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {profile.specialization}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <input
                  id="avatarInput"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('avatarInput')?.click()}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Change Photo</span>
                </button>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-lg p-8 h-fit">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Professional Information</h2>
                <p className="text-gray-600">Update your professional details and credentials</p>
              </div>

              <div className="space-y-6">
                {/* Personal Information Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Personal Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <input
                        name="fullName"
                        value={profile.fullName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                        placeholder="Dr. John Smith"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <input
                        name="email"
                        value={profile.email}
                        readOnly
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <input
                        name="phone"
                        value={profile.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>
                </div>

                {/* Professional Information Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Professional Credentials</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>License Number</Label>
                      <input
                        name="licenseNumber"
                        value={profile.licenseNumber}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                        placeholder="PSY12345"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Specialization</Label>
                      <select
                        name="specialization"
                        value={profile.specialization}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                      >
                        <option value="">Select your specialization</option>
                        <option>Anxiety</option>
                        <option>Depression</option>
                        <option>Relationship Counselling</option>
                        <option>Grief Support</option>
                        <option>Stress Management</option>
                        <option>Trauma Therapy</option>
                        <option>Family Therapy</option>
                        <option>Addiction Counselling</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Fees (per hour)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                        <input
                          name="fees"
                          value={profile.fees}
                          onChange={handleChange}
                          className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                          placeholder="1500"
                          type="number"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Availability</Label>
                      <select
                        name="availability"
                        value={profile.availability}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                      >
                        <option value="">Select your availability</option>
                        <option>Weekdays (9 AM - 5 PM)</option>
                        <option>Weekends</option>
                        <option>Evenings (6 PM - 10 PM)</option>
                        <option>Flexible</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Bio Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Professional Bio</h3>
                  <div className="space-y-2">
                    <Label>About You</Label>
                    <textarea
                      name="bio"
                      value={profile.bio}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white h-32 resize-none"
                      placeholder="Tell us about your experience, approach to therapy, and what makes you unique as a counsellor..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CounsellorProfile;