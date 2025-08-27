'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TermsAndConditions() {
  const router = useRouter();
  const [isAccepted, setIsAccepted] = useState(false);
  const [isDataConsentAccepted, setIsDataConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = async () => {
    if (!isAccepted) {
      setError('Please accept the terms and conditions to continue.');
      return;
    }

    if (!isDataConsentAccepted) {
      setError('Please consent to the data collection and processing to continue.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:8080/api/accept-terms/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRFToken': document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1] || '',
        },
        credentials: 'include',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept terms');
      }

      // Redirect to appropriate dashboard based on user role
      const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
      const userRole = userData.role;

      if (userRole === 'student') {
        // Check if student has already submitted mood for today
        try {
          const moodResponse = await fetch('http://127.0.0.1:8080/api/check-mood/', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            credentials: 'include',
          });
          
          if (moodResponse.ok) {
            const moodData = await moodResponse.json();
            if (moodData && moodData.mood && moodData.mood !== null) {
              router.push('/student/dashboard');
            } else {
              router.push('/student/dashboard/get-started');
            }
          } else {
            // If API call fails, go to get-started
            router.push('/student/dashboard/get-started');
          }
        } catch (e) {
          router.push('/student/dashboard/get-started');
        }
      } else if (userRole === 'admin') {
        router.push('/admin/dashboard');
      } else if (userRole === 'clinic') {
        router.push('/clinic/dashboard');
      } else if (userRole === 'counselor') {
        router.push('/counselor/dashboard');
      } else if (userRole === 'faculty') {
        router.push('/faculty/dashboard');
      } else {
        router.push('/student/dashboard/get-started');
      }
    } catch (error) {
      setError(error.message || 'Failed to accept terms and conditions.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    // Clear localStorage and redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('full_name');
    localStorage.removeItem('user_data');
    router.push('/login');
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center" style={{ background: '#f8f9fa' }}>
      <div className="row justify-content-center w-100">
        <div className="col-12 col-md-8 col-lg-6">
          <div className="card shadow-sm border-0" style={{ borderRadius: '12px' }}>
            <div className="card-body p-4 p-md-5">
              {/* Header */}
              <div className="text-center mb-4">
                <h2 className="fw-bold" style={{ color: '#1b8c8c' }}>AMIETI</h2>
                <p className="text-muted mb-1">A Health Information System with Rule-Based Mental Health Chatbot</p>
                <p className="text-muted mb-4">and Descriptive Analytics for the Overall Well-Being of Students</p>
                <h4 className="fw-bold" style={{ color: '#333' }}>Terms and Conditions</h4>
                <p className="text-muted small">Please read and accept the following terms before accessing the system</p>
              </div>

              {/* Scrollable Terms Content */}
              <div 
                className="border rounded p-3 mb-4" 
                style={{ 
                  height: '400px', 
                  overflowY: 'auto', 
                  backgroundColor: '#fff',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}
              >
                <div className="terms-content">
                  <h6 className="fw-bold mb-3">1. Acceptance of Terms</h6>
                  <p className="mb-4">
                    By accessing and using AMIETI (A Health Information System with Rule-Based Mental Health Chatbot and Descriptive Analytics for the Overall Well-Being of Students), you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions and all applicable laws and regulations.
                  </p>

                  <h6 className="fw-bold mb-3">2. Purpose and Scope</h6>
                  <p className="mb-2">AMIETI is designed to:</p>
                  <ul className="mb-4">
                    <li>Provide mental health support through rule-based chatbot interactions</li>
                    <li>Collect and analyze health-related data for student well-being</li>
                    <li>Generate descriptive analytics to improve campus health services</li>
                    <li>Facilitate early intervention and support for students in need</li>
                  </ul>

                  <h6 className="fw-bold mb-3">3. Health Information and Medical Disclaimer</h6>
                  <p className="mb-2">
                    <strong>IMPORTANT:</strong> AMIETI is not a substitute for professional medical advice, diagnosis, or treatment. The chatbot provides general information and support only. Always seek the advice of qualified health providers with questions regarding medical conditions.
                  </p>
                  <ul className="mb-4">
                    <li>The system does not provide medical diagnoses</li>
                    <li>Emergency situations require immediate professional help</li>
                    <li>All interactions are for educational and support purposes</li>
                  </ul>

                  <h6 className="fw-bold mb-3">4. Data Collection and Privacy</h6>
                  <p className="mb-2">We collect and process the following types of information:</p>
                  <ul className="mb-4">
                    <li>Basic demographic information (age, gender, academic year)</li>
                    <li>Health-related responses and mental wellness indicators</li>
                    <li>Chatbot interaction logs for system improvement</li>
                    <li>Usage patterns and system analytics</li>
                    <li>Academic performance correlations (with consent)</li>
                  </ul>

                  <h6 className="fw-bold mb-3">5. Confidentiality and Security</h6>
                  <p className="mb-4">
                    All personal health information is treated with strict confidentiality. We implement appropriate technical and organizational measures to protect your data against unauthorized access, alteration, disclosure, or destruction. Data is anonymized for research and analytics purposes.
                  </p>

                  <h6 className="fw-bold mb-3">6. Student Rights and Responsibilities</h6>
                  <p className="mb-2">As a user, you have the right to:</p>
                  <ul className="mb-3">
                    <li>Access your personal data and request corrections</li>
                    <li>Withdraw consent for data processing at any time</li>
                    <li>Request deletion of your data (subject to legal requirements)</li>
                    <li>Receive transparent information about data usage</li>
                  </ul>
                  <p className="mb-2">You are responsible for:</p>
                  <ul className="mb-4">
                    <li>Providing accurate and truthful information</li>
                    <li>Using the system appropriately and ethically</li>
                    <li>Seeking professional help when necessary</li>
                    <li>Maintaining the confidentiality of your login credentials</li>
                  </ul>

                  <h6 className="fw-bold mb-3">7. Analytics and Research</h6>
                  <p className="mb-4">
                    Aggregated and anonymized data may be used for research purposes to improve student mental health services, develop better support systems, and contribute to academic research in digital health interventions. Individual data will never be shared without explicit consent.
                  </p>

                  <h6 className="fw-bold mb-3">8. Crisis Intervention</h6>
                  <p className="mb-4">
                    If the system detects potential crisis situations or high-risk indicators, appropriate campus mental health professionals may be notified to ensure student safety. This may override standard privacy protections in cases of imminent danger.
                  </p>

                  <h6 className="fw-bold mb-3">9. Intellectual Property</h6>
                  <p className="mb-4">
                    All content, software, and materials provided through AMIETI are owned by the institution and protected by intellectual property laws. Users are granted a limited license to use the system for its intended purposes only.
                  </p>

                  <h6 className="fw-bold mb-3">10. Limitation of Liability</h6>
                  <p className="mb-4">
                    AMIETI is provided "as is" without warranties. The institution shall not be liable for any direct, indirect, incidental, or consequential damages arising from the use of this system. Users acknowledge the limitations of digital health tools.
                  </p>

                  <h6 className="fw-bold mb-3">11. System Availability</h6>
                  <p className="mb-4">
                    While we strive to maintain system availability, we do not guarantee uninterrupted access. Scheduled maintenance and unforeseen technical issues may temporarily limit access to the system.
                  </p>

                  <h6 className="fw-bold mb-3">12. Changes to Terms</h6>
                  <p className="mb-4">
                    These terms may be updated periodically. Users will be notified of significant changes and may be required to re-accept updated terms. Continued use of the system constitutes acceptance of any modifications.
                  </p>

                  <h6 className="fw-bold mb-3">13. Contact Information</h6>
                  <p className="mb-4">
                    For questions about these terms or the AMIETI system, please contact your institution's Student Health Services or the system administrators through the appropriate channels.
                  </p>

                  <h6 className="fw-bold mb-3">14. Governing Law</h6>
                  <p className="mb-4">
                    These terms are governed by applicable educational privacy laws, health information regulations, and local jurisdiction laws. Any disputes will be resolved through appropriate institutional procedures.
                  </p>
                </div>
              </div>

              {/* Consent Section */}
              <div className="mb-4">
                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="acceptTerms"
                    checked={isAccepted}
                    onChange={(e) => setIsAccepted(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="acceptTerms">
                    I have read and agree to the Terms and Conditions for using AMIETI. I understand that this system is for educational and support purposes and does not substitute professional medical advice.
                  </label>
                </div>

                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="dataConsent"
                    checked={isDataConsentAccepted}
                    onChange={(e) => setIsDataConsentAccepted(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="dataConsent">
                    I consent to the collection, processing, and analysis of my health-related data as described above. I understand my rights regarding data privacy and the measures taken to protect my information.
                  </label>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="d-flex gap-3">
                <button
                  type="button"
                  className="btn flex-fill fw-bold"
                  style={{ 
                    backgroundColor: '#6c757d', 
                    color: 'white',
                    border: 'none'
                  }}
                  onClick={handleAccept}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Accept and Continue to Login'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary flex-fill"
                  onClick={handleDecline}
                  disabled={loading}
                >
                  Decline and Exit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
