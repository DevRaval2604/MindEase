import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const USE_MOCK = import.meta.env.VITE_USE_MOCK_RAZORPAY === 'true';

  // Load Razorpay script only when not using mock mode
  useEffect(() => {
    if (USE_MOCK) return;
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);
    return () => {
      try { document.body.removeChild(script); } catch (_) { }
    };
  }, [USE_MOCK]);

  // Define createAppointment function before useEffect
  const createAppointment = async (appointmentData) => {
    setLoading(true);
    setError('');
    try {
      const requestBody = {
        counsellor_id: appointmentData.therapistId,  // Can be User.id or CounsellorProfile.id
        appointment_date: appointmentData.datetimeIso,
        duration_minutes: 60,
        notes: appointmentData.notes || '',
      };

      console.log('Creating appointment - Request:', {
        url: `${API_BASE}/api/appointments/create/`,
        body: requestBody,
      });

      // Create appointment in backend
      const response = await fetch(`${API_BASE}/api/appointments/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      console.log('Response received - Status:', response.status, 'Content-Type:', response.headers.get('content-type'));

      // Read response as text first (can only read once)
      const responseText = await response.text();
      const contentType = response.headers.get('content-type') || '';

      // Check if response is JSON
      if (!contentType.includes('application/json')) {
        console.error('Non-JSON response received (first 500 chars):', responseText.substring(0, 500));
        console.error('Full response status:', response.status);
        console.error('Response URL:', response.url);
        throw new Error(`Server returned HTML instead of JSON (Status: ${response.status}). This usually means: 1) The endpoint doesn't exist, 2) There's a server error, or 3) You're not authenticated. Check backend logs.`);
      }

      // Parse JSON response
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse JSON. Response text (first 500 chars):', responseText.substring(0, 500));
        throw new Error('Server returned invalid JSON. Check the console for details.');
      }

      if (!response.ok) {
        console.error('Error response from server:', responseData);
        const errorMsg = responseData.detail || responseData.message || (responseData.errors ? JSON.stringify(responseData.errors) : 'Failed to create appointment');
        throw new Error(errorMsg);
      }

      console.log('Appointment created successfully:', responseData);
      setAppointment(responseData);
      setLoading(false);
    } catch (err) {
      console.error('Error creating appointment:', err);
      setError(err.message || 'Failed to create appointment. Please try again.');
      setLoading(false);
    }
  };

  // Get appointment data from location state and create appointment
  useEffect(() => {
    if (location.state?.appointmentData && !appointment && !error && !loading) {
      // Create appointment in backend only once
      createAppointment(location.state.appointmentData);
    } else if (!location.state?.appointmentData && !appointment) {
      setError('No appointment data found. Please book an appointment first.');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const handlePayment = async () => {
    if (!appointment || !razorpayLoaded) {
      setError('Please wait for payment gateway to load.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create order (real or mock depending on env)
      const createUrl = USE_MOCK ? `${API_BASE}/api/appointments/razorpay/mock/create-order/` : `${API_BASE}/api/appointments/razorpay/create-order/`;
      const orderResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ appointment_id: appointment.id }),
      });

      // Read response as text first (can only read once)
      const orderResponseText = await orderResponse.text();
      const orderContentType = orderResponse.headers.get('content-type') || '';

      // Check if response is JSON
      if (!orderContentType.includes('application/json')) {
        console.error('Non-JSON response from order creation:', orderResponseText.substring(0, 500));
        throw new Error(`Server returned HTML instead of JSON while creating payment order. Status: ${orderResponse.status}. Check backend logs.`);
      }

      // Parse JSON
      let orderData;
      try {
        orderData = JSON.parse(orderResponseText);
      } catch (parseError) {
        console.error('Failed to parse order response JSON:', orderResponseText.substring(0, 500));
        throw new Error('Server returned invalid JSON for payment order. Check the console for details.');
      }

      if (!orderResponse.ok) {
        console.error('Order creation error:', orderData);
        throw new Error(orderData.detail || orderData.message || 'Failed to create payment order');
      }

      console.log('Razorpay order created:', orderData);

      // If using mock flow: directly call mock verify endpoint to mark appointment paid
      if (USE_MOCK) {
        const verifyUrl = `${API_BASE}/api/appointments/razorpay/mock/verify-payment/`;
        const mockPayload = {
          appointment_id: appointment.id,
          razorpay_order_id: orderData.order_id,
          razorpay_payment_id: `mock_payment_${appointment.id}`,
          razorpay_signature: 'mock_signature',
        };

        const verifyResponse = await fetch(verifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(mockPayload),
        });

        const verifyText = await verifyResponse.text();
        const verifyContentType = verifyResponse.headers.get('content-type') || '';
        if (!verifyContentType.includes('application/json')) {
          console.error('Non-JSON response from mock verification:', verifyText.substring(0, 500));
          throw new Error(`Server returned HTML instead of JSON while verifying payment. Status: ${verifyResponse.status}. Check backend logs.`);
        }
        const verifyData = JSON.parse(verifyText);
        if (!verifyResponse.ok) throw new Error(verifyData.detail || 'Mock verification failed');

        console.log('Mock payment verified:', verifyData);
        navigate('/dashboard', { state: { paymentSuccess: true } });
        setLoading(false);
      } else {
        // Razorpay options
        const options = {
          key: orderData.key,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'MindEase',
          description: `Appointment with ${appointment.counsellor_name}`,
          order_id: orderData.order_id,
          handler: async function (response) {
            // Verify payment
            try {
              const verifyResponse = await fetch(`${API_BASE}/api/appointments/razorpay/verify-payment/`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                  appointment_id: appointment.id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });

              // Read response as text first (can only read once)
              const verifyResponseText = await verifyResponse.text();
              const verifyContentType = verifyResponse.headers.get('content-type') || '';

              // Check if response is JSON
              if (!verifyContentType.includes('application/json')) {
                console.error('Non-JSON response from payment verification:', verifyResponseText.substring(0, 500));
                throw new Error(`Server returned HTML instead of JSON while verifying payment. Status: ${verifyResponse.status}. Check backend logs.`);
              }

              // Parse JSON
              let verifyData;
              try {
                verifyData = JSON.parse(verifyResponseText);
              } catch (parseError) {
                console.error('Failed to parse verification response JSON:', verifyResponseText.substring(0, 500));
                throw new Error('Server returned invalid JSON for payment verification. Check the console for details.');
              }

              if (!verifyResponse.ok) {
                console.error('Payment verification error:', verifyData);
                throw new Error(verifyData.detail || verifyData.message || 'Payment verification failed');
              }

              console.log('Payment verified successfully:', verifyData);

              // Payment successful, wait a moment for backend to process, then redirect to dashboard
              setTimeout(() => {
                navigate('/dashboard', { state: { paymentSuccess: true } });
              }, 500);
            } catch (err) {
              setError(err.message || 'Payment verification failed');
              setLoading(false);
            }
          },
          prefill: {
            name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : '',
            email: user?.email || '',
            contact: user?.phone || '',
          },
          theme: { color: '#2563eb' },
          modal: { ondismiss: function () { setLoading(false); } },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
        setLoading(false);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Failed to initiate payment. Please try again.');
      setLoading(false);
    }
  };

  if (!appointment && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Creating appointment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Complete Payment</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {appointment && (
            <>
              {/* Test Mode Notice */}
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-yellow-800 mb-1">Test Mode - No Real Money!</h3>
                    <p className="text-xs text-yellow-700 mb-2">
                      You're in test mode. No real money will be charged. Use Indian test card (enter without spaces):
                    </p>
                    <details className="text-xs text-yellow-700" open>
                      <summary className="cursor-pointer font-medium hover:text-yellow-800 mb-2">Test Card Details (Click to expand/collapse)</summary>
                      <div className="mt-2 pl-2 border-l-2 border-yellow-300 space-y-1">
                        <p className="mb-2"><strong className="text-yellow-900">Recommended (Mastercard):</strong></p>
                        <p className="mb-1"><strong>Card Number:</strong> <code className="bg-yellow-100 px-1 rounded">5267318187975449</code> (Enter without spaces)</p>
                        <p className="mb-1"><strong>OR (Visa):</strong> <code className="bg-yellow-100 px-1 rounded">4012888888881881</code></p>
                        <p className="mb-1"><strong>Expiry:</strong> Any future date (e.g., 12/25)</p>
                        <p className="mb-1"><strong>CVV:</strong> Any 3 digits (e.g., 123)</p>
                        <p className="mb-1"><strong>OTP:</strong> 123456 (if asked)</p>
                        <p className="mt-2 text-yellow-900 font-semibold">⚠️ If you see "International cards not supported":</p>
                        <p className="mb-1">• Make sure to enter card number WITHOUT spaces</p>
                        <p className="mb-1">• Use: <code className="bg-yellow-100 px-1 rounded">5267318187975449</code></p>
                      </div>
                    </details>
                  </div>
                </div>
              </div>

              <div className="mb-6 space-y-4">
                <div className="border-b border-gray-200 pb-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Appointment Details</h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Counsellor:</span>
                      <span className="font-medium">{appointment.counsellor_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date & Time:</span>
                      <span className="font-medium">
                        {new Date(appointment.appointment_date).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{appointment.duration_minutes} minutes</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ₹{parseFloat(appointment.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    // Pass therapist data back so BookAppointment doesn't reset
                    const therapistData = location.state?.appointmentData ? {
                      id: location.state.appointmentData.therapistId,
                      name: location.state.appointmentData.therapistName,
                      email: location.state.appointmentData.therapistEmail
                    } : (appointment ? { id: appointment.counsellor_id, name: appointment.counsellor_name } : null);

                    navigate('/appointments/book', { state: { therapist: therapistData } });
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  disabled={loading || (!razorpayLoaded && !USE_MOCK)}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Processing...' : USE_MOCK ? 'Simulate Payment' : (razorpayLoaded ? 'Pay Now (Test Mode)' : 'Loading...')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Payment;

