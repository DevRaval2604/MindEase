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
          const dbFullName = data.full_name || `${(data.first_name || '').trim()} ${(data.last_name || '').trim()}`.trim();
          const dbEmail = data.email || '';
          const dbPhone = data.phone || '';
          const dbAvatar = data.profile_picture || '';
          // Server-provided counsellor fields
          const dbLicense = data.license_number || '';
          const dbFees = data.fees_per_session || '';
          const dbBio = data.bio || '';
          const dbExperience = data.experience || '';
          const dbSpecializations = (data.specializations || []).map(s => s.name).join(', ');
          const dbAvailability = (data.availability || []).map(a => a.name).join(', ');

          // Load additional fields from localStorage if they exist (fallback)
          let saved = {};
          try {
            saved = JSON.parse(localStorage.getItem('counsellorProfile') || '{}');
          } catch (e) {
            console.error('Error loading localStorage data:', e);
          }

          // Set profile with database data (priority) and localStorage as fallback
          setProfile({
            fullName: dbFullName,
            email: dbEmail,
            phone: dbPhone,
            avatar: dbAvatar,
            licenseNumber: dbLicense || saved.licenseNumber || '',
            specialization: dbSpecializations || saved.specialization || '',
            fees: dbFees || saved.fees || '',
            availability: dbAvailability || saved.availability || '',
            bio: dbBio || saved.bio || '',
            experience: dbExperience || saved.experience || '',
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
      // Upload avatar if it's a base64 data URL
      async function uploadAvatarIfNeeded(dataUrl) {
        if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;
        try {
          const resBlob = await fetch(dataUrl);
          const blob = await resBlob.blob();
          const fd = new FormData();
          const ext = blob.type.split('/')[1] || 'png';
          const file = new File([blob], `avatar.${ext}`, { type: blob.type });
          fd.append('profile_picture', file);

          const uploadRes = await fetch(`${API_BASE}/api/auth/profile/upload-photo/`, {
            method: 'POST',
            credentials: 'include',
            body: fd,
          });
          if (!uploadRes.ok) {
            const text = await uploadRes.text();
            throw new Error(`Upload failed: ${uploadRes.status} ${text}`);
          }
          const j = await uploadRes.json();
          return j.profile_picture || dataUrl;
        } catch (err) {
          console.error('Avatar upload failed:', err);
          return dataUrl;
        }
      }

      const maybeUploadedUrl = await uploadAvatarIfNeeded(profile.avatar);
      // Update basic profile fields in database
      const updateData = {
        first_name: profile.fullName.split(' ')[0] || '',
        last_name: profile.fullName.split(' ').slice(1).join(' ') || '',
        phone: profile.phone || '',
        profile_picture: maybeUploadedUrl || profile.avatar || '',
        // Counsellor-specific fields to persist server-side
        license_number: profile.licenseNumber || '',
        fees_per_session: profile.fees ? parseFloat(profile.fees) : null,
        bio: profile.bio || '',
        experience: profile.experience || '',
      };

      const res = await fetch(`${API_BASE}/api/auth/profile/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        const updatedData = await res.json();
        console.log('Profile updated in database:', updatedData);

        // Update UI state from returned data
        const dbFullName = updatedData.full_name || `${(updatedData.first_name || '').trim()} ${(updatedData.last_name || '').trim()}`.trim();
        const dbAvatar = updatedData.profile_picture || '';
        const dbLicense = updatedData.license_number || '';
        const dbFees = updatedData.fees_per_session || '';
        const dbBio = updatedData.bio || '';
        const dbExperience = updatedData.experience || '';
        const dbSpecializations = (updatedData.specializations || []).map(s => s.name).join(', ');
        const dbAvailability = (updatedData.availability || []).map(a => a.name).join(', ');

        setProfile(prev => ({
          ...prev,
          fullName: dbFullName,
          email: updatedData.email || prev.email,
          phone: updatedData.phone || prev.phone,
          avatar: dbAvatar,
          licenseNumber: dbLicense,
          fees: dbFees,
          bio: dbBio,
          experience: dbExperience,
          specialization: dbSpecializations,
          availability: dbAvailability,
        }));

        // Save additional fields to localStorage as fallback (specializations/availability selections)
        const additionalData = {
          licenseNumber: dbLicense,
          specialization: dbSpecializations,
          fees: dbFees,
          availability: dbAvailability,
          bio: dbBio,
          experience: dbExperience,
        };
        localStorage.setItem('counsellorProfile', JSON.stringify(additionalData));

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
                  type="button"
                  onClick={handleSave}
                  className="mr-4 bg-white text-gray-700 px-6 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all duration-150"
                >
                  Update Details
                </button>
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