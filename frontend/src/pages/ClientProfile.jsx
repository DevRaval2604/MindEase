import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

function Label({ children }) {
  return <div className="text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">{children}</div>;
}

function ClientProfile() {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: '',
    dob: '',
    about: '',
    avatar: '',
  });

  // Fetch user profile from database for logged-in user
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
          console.log('ClientProfile: Loaded data from database:', data);

          // Get database fields - ensure all fields are properly extracted
          const dbFullName = data.full_name || `${(data.first_name || '').trim()} ${(data.last_name || '').trim()}`.trim();
          const dbEmail = data.email || '';
          const dbPhone = data.phone || '';
          const dbAvatar = data.profile_picture || '';
          // Server-provided additional fields
          const dbGender = data.gender || '';
          const dbDob = data.date_of_birth || '';
          const dbAbout = data.bio || '';

          // Load additional fields from localStorage if they exist
          let saved = {};
          try {
            saved = JSON.parse(localStorage.getItem('clientProfile') || '{}');
          } catch (e) {
            console.error('Error loading localStorage data:', e);
          }

          // Set profile with database data (priority) and localStorage as fallback
          setProfile({
            fullName: dbFullName,
            email: dbEmail,
            phone: dbPhone,
            avatar: dbAvatar,
            // Additional fields: prefer server values, fall back to localStorage
            gender: dbGender || saved.gender || '',
            dob: dbDob || saved.dob || '',
            about: dbAbout || saved.about || '',
          });

          console.log('ClientProfile: Profile set with database data:', {
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
      // If avatar is a base64 data URL, upload it first and replace with returned URL
      async function uploadAvatarIfNeeded(dataUrl) {
        if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;
        try {
          const resBlob = await fetch(dataUrl);
          const blob = await resBlob.blob();
          const fd = new FormData();
          // Provide a filename with a suitable extension if possible
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
          // Return original dataUrl so we don't block save, but server may reject it
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
        // Additional fields mapped to server serializer
        bio: profile.about || '',
        gender: profile.gender || '',
        date_of_birth: profile.dob || '',
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

        // Update UI state with returned data
        const dbFullName = updatedData.full_name || `${(updatedData.first_name || '').trim()} ${(updatedData.last_name || '').trim()}`.trim();
        const dbAvatar = updatedData.profile_picture || '';
        const dbGender = updatedData.gender || '';
        const dbDob = updatedData.date_of_birth || '';
        const dbAbout = updatedData.bio || '';

        setProfile(prev => ({
          ...prev,
          fullName: dbFullName,
          email: updatedData.email || prev.email,
          phone: updatedData.phone || prev.phone,
          avatar: dbAvatar,
          gender: dbGender,
          dob: dbDob,
          about: dbAbout,
        }));

        // Save additional fields (gender, dob, about) to localStorage as fallback
        const additionalData = {
          gender: dbGender,
          dob: dbDob,
          about: dbAbout,
        };
        localStorage.setItem('clientProfile', JSON.stringify(additionalData));

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
      <div className="flex h-screen">
        <aside className="w-80 bg-white shadow-lg">
          <div className="p-6">
            <div className="flex items-center space-x-2 mb-8">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">MindEase</h1>
            </div>
          </div>
        </aside>
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="text-xl text-gray-600">Loading profile...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <aside className="w-80 bg-white shadow-lg">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">MindEase</h1>
          </div>

          <nav className="space-y-2">
            <Link
              to="/dashboard"
              className="w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors text-gray-600 hover:bg-gray-50"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
              </svg>
              Dashboard
            </Link>

            <Link
              to="/profile"
              className="w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors bg-blue-50 text-blue-700 border-r-2 border-blue-600"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile
            </Link>
          </nav>
        </div>
      </aside>
      {/* </div><div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100"> */}
      <div className="min-h-screen w-full">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Settings</h1>
            <p className="text-gray-600">Manage your personal information and preferences</p>
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
                      <div className="w-full h-full flex items-center justify-center text-4xl text-white">👤</div>
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
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Personal Information</h2>
                  <p className="text-gray-600">Update your personal details and preferences</p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <input
                        name="fullName"
                        value={profile.fullName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <input
                        type="email"
                        name="email"
                        value={profile.email}
                        readOnly
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                        placeholder="you@example.com"
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
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <select
                        name="gender"
                        value={profile.gender}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                      >
                        <option value="">Select Gender</option>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                        <option>Prefer not to say</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <input
                        type="date"
                        name="dob"
                        value={profile.dob}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>About You</Label>
                    <textarea
                      name="about"
                      value={profile.about}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white h-32 resize-none"
                      placeholder="Tell us a bit about yourself, your interests, and what you're looking for in therapy..."
                    />
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
    </div>
  );
}

export default ClientProfile;


