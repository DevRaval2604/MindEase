import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('Verifying your email...');

  const [email, setEmail] = useState('');
  const [resendStatus, setResendStatus] = useState(null);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    const verifyEmail = async () => {
      try {
        // Decode the token in case it's URL encoded
        const decodedToken = decodeURIComponent(token);
        
        const response = await fetch(`${API_BASE}/api/auth/verify-email/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ token: decodedToken }),
        });

        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          // If response is not JSON, handle as error
          const text = await response.text();
          console.error('Non-JSON response:', text);
          setStatus('error');
          setMessage('Email verification failed. The server returned an invalid response.');
          return;
        }

        if (response.ok) {
          // Success - redirect to login page
          // If opened in a new tab/window (has opener), redirect the opener and close this window
          // Otherwise, do a normal redirect
          const successMessage = data.detail || 'Email verified successfully! You can now log in.';
          
          // Try to redirect the opener window if this was opened from another tab/window
          // This handles the case where email client opens link in new tab
          try {
            if (window.opener && !window.opener.closed && window.opener.location) {
              // Redirect the original tab/window to login page with success message
              window.opener.location.href = '/login?verified=true';
              // Close this verification tab/window
              setTimeout(() => {
                window.close();
              }, 100);
              return;
            }
          } catch (e) {
            // Cross-origin or other error - just do normal redirect
            console.log('Could not access opener window, doing normal redirect');
          }
          
          // Normal redirect in the same window/tab
          navigate('/login', { 
            state: { 
              message: successMessage,
              verified: true 
            } 
          });
          return;
        } else {
          setStatus('error');
          setMessage(data.detail || 'Email verification failed. The link may be invalid or expired.');
          // Extract email from error message or token if possible (for resend functionality)
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred while verifying your email. Please check your connection and try again.');
        console.error('Verification error:', error);
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  const handleResendVerification = async () => {
    if (!email) {
      setMessage('Please enter your email address to resend the verification link.');
      return;
    }

    setResendStatus('sending');
    try {
      const response = await fetch(`${API_BASE}/api/auth/resend-verification/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        setResendStatus('error');
        setMessage('Failed to resend verification email. Please try again.');
        return;
      }
      
      console.log('Resend verification response:', response.status, data);
      
      if (response.ok) {
        // Check if email is already verified
        if (data.verified || data.detail?.toLowerCase().includes('already verified')) {
          setResendStatus('success');
          setMessage('Your email is already verified! You can log in now.');
          // Redirect to login after a delay
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          setResendStatus('success');
          setMessage('Verification email sent! Please check your inbox (and spam folder) and click the new verification link.');
        }
      } else if (response.status === 429) {
        // Throttling error
        setResendStatus('error');
        setMessage(data.detail || 'Too many requests. Please wait before trying again.');
      } else {
        setResendStatus('error');
        setMessage(data.detail || 'Failed to resend verification email. Please try again.');
      }
    } catch (error) {
      setResendStatus('error');
      setMessage('Failed to resend verification email. Please check your connection and try again.');
      console.error('Resend error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
                <svg
                  className="h-8 w-8 text-blue-600 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Your Email</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}


          {status === 'error' && (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              
              {resendStatus === 'success' ? (
                <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                  <p className="text-green-800 text-sm">{message}</p>
                </div>
              ) : (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter your email to receive a new verification link:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="flex-1 p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleResendVerification}
                      disabled={resendStatus === 'sending' || !email}
                      className="bg-blue-600 text-white px-4 py-2.5 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {resendStatus === 'sending' ? 'Sending...' : 'Resend'}
                    </button>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Go to Login
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="w-full bg-gray-200 text-gray-800 py-2.5 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Register Again
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;

