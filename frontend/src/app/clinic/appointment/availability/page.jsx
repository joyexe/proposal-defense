"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAvailability, updateAvailability, createAvailability, deleteAvailability, getUserProfile, getStudents, getProviders, getProviderAvailableTimes, createAppointment } from '../../../utils/api';

const initialSlots = [
  { time: "7:00 AM", available: true },
  { time: "8:00 AM", available: true },
  { time: "9:00 AM", available: true },
  { time: "10:00 AM", available: true },
  { time: "11:00 AM", available: true },
  { time: "1:00 PM", available: false },
  { time: "2:00 PM", available: true },
  { time: "3:00 PM", available: true },
  { time: "4:00 PM", available: true },
  { time: "5:00 PM", available: true },
];

const allTimes = [
  "9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM"
];

const defaultTimes = [
  "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"
];

function getTodayDate() {
  const today = new Date();
  return today.toISOString().split('T')[0]; // 'YYYY-MM-DD'
}

function mergeSlotsWithDefaults(backendSlots) {
  // Map backend slots by time for quick lookup (normalize to HH:MM:SS)
  const slotMap = {};
  backendSlots.forEach(slot => { slotMap[slot.time] = slot; });
  // For each default time, use backend slot if exists, else create an unchecked slot (available: false)
  return defaultTimes.map(time => {
    const normTime = toHHMMSS(time);
    return slotMap[normTime] ? slotMap[normTime] : { time: normTime, available: false };
  });
}

function toHHMMSS(timeStr) {
  // Converts '7:00 AM' or '07:00' to '07:00:00', '13:00' to '13:00:00', etc.
  if (timeStr.includes('AM') || timeStr.includes('PM')) {
    // Convert 12-hour to 24-hour first
    const [time, period] = timeStr.split(' ');
    let [hour, minute] = time.split(':');
    hour = parseInt(hour, 10);
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, '0')}:${minute}:00`;
  }
  // If already 24-hour, add :00 if needed
  let [h, m, s] = timeStr.split(':');
  if (typeof s === 'undefined') s = '00';
  return `${h.padStart(2, '0')}:${m}:${s}`;
}

function toDisplayTime(hhmmss) {
  let [h, m] = hhmmss.split(":");
  h = parseInt(h, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export default function ManageAvailability() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const router = useRouter();
  const pathname = usePathname();
  const [showReferModal, setShowReferModal] = useState(false);
  const [referStudentName, setReferStudentName] = useState("");
  const [referTo, setReferTo] = useState("");
  const [referDate, setReferDate] = useState("");
  const [referTime, setReferTime] = useState("");
  const [referNotes, setReferNotes] = useState("");
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [providers, setProviders] = useState([]);
  const [referAvailableTimes, setReferAvailableTimes] = useState([]);
  const allowedTimes = [
    '07:00', '08:00', '09:00', '10:00', '11:00',
    '13:00', '14:00', '15:00', '16:00', '17:00'
  ];
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);

  useEffect(() => {
    // Fetch user profile first
    getUserProfile().then(profile => setUserId(profile.id)).catch(() => setUserId(null));
  }, []);

  const ensureAllSlotsExist = async (backendSlots) => {
    if (!userId) return;
    const backendTimes = backendSlots.map(s => s.time);
    const missingTimes = defaultTimes.filter(time => !backendTimes.includes(toHHMMSS(time)));
    if (missingTimes.length > 0) {
      await Promise.all(missingTimes.map(time => {
        // Only create if not already present
        if (!backendSlots.some(s => s.time === toHHMMSS(time))) {
          return createAvailability({ provider_id: userId, time: toHHMMSS(time), available: true, date: getTodayDate() });
        }
        return null;
      }));
      // Always re-fetch after create to get the correct ids
      return true;
    }
    return false;
  };

  const fetchSlots = async () => {
    setLoading(true);
    setError(null);
    try {
      const backendSlots = await getAvailability();
      const created = await ensureAllSlotsExist(backendSlots);
      // If we created any, fetch again to get correct ids
      const allBackendSlots = created ? await getAvailability() : backendSlots;
      setSlots(mergeSlotsWithDefaults(allBackendSlots));
    } catch (err) {
      setError(err.message || 'Failed to load availability.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchSlots();
    // eslint-disable-next-line
  }, [userId]);

  const handleToggle = async (time) => {
    setError(null);
    const idx = slots.findIndex(s => s.time === toHHMMSS(time));
    let prevSlots = [...slots];
    let updatedSlot, newSlots;
    if (idx === -1) {
      // Slot does not exist, create it as available (checked)
      updatedSlot = { time: toHHMMSS(time), available: true };
      newSlots = [...slots, updatedSlot];
      setSlots(newSlots);
      setSaving(true);
      try {
        await createAvailability({ provider_id: userId, time: toHHMMSS(time), available: true, date: getTodayDate() });
        await fetchSlots();
      } catch (err) {
        setError(err.message || 'Failed to update availability.');
        setSlots(prevSlots); // Revert on error
      } finally {
        setSaving(false);
      }
      return;
    }
    // Optimistically update UI
    updatedSlot = { ...slots[idx], available: !slots[idx].available };
    newSlots = slots.map((s, i) => i === idx ? updatedSlot : s);
    setSlots(newSlots);
    setSaving(true);
    try {
      if (slots[idx].id) {
        await updateAvailability(slots[idx].id, JSON.stringify({ available: updatedSlot.available, date: getTodayDate() }));
        await fetchSlots();
      } else {
        await createAvailability({ provider_id: userId, time: toHHMMSS(updatedSlot.time), available: updatedSlot.available, date: getTodayDate() });
        await fetchSlots();
      }
    } catch (err) {
      setError(err.message || 'Failed to update availability.');
      setSlots(prevSlots); // Revert on error
    } finally {
      setSaving(false);
    }
  };

  const handleAddSlot = () => {
    const used = slots.map(s => s.time);
    const next = allTimes.find(t => !used.includes(t));
    if (next) setSlots([...slots, { time: next, available: false }]);
  };

  useEffect(() => {
    if (showReferModal) {
      getStudents().then(data => {
        setStudents(data);
        setFilteredStudents(data);
      });
      getProviders().then(setProviders);
      setReferTo(""); setReferDate(""); setReferTime(""); setReferStudentName(""); setReferNotes("");
    }
  }, [showReferModal]);

  useEffect(() => {
    if (referTo) {
      getProviderAvailableTimes(referTo).then(setReferAvailableTimes);
    } else {
      setReferAvailableTimes([]);
    }
  }, [referTo]);

  function handleStudentSearch(e) {
    const val = e.target.value.toLowerCase();
    setReferStudentName(val);
    setFilteredStudents(students.filter(s => s.full_name.toLowerCase().includes(val)));
  }

  function to12Hour(time) {
    let [h, m] = time.split(':');
    h = parseInt(h, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  }

  useEffect(() => {
    // Listen for real-time update event
    const handler = () => {
      // No auto-reload here; let other pages handle updates
      // If you have a fetch function for appointments/availability, call it here if needed
      // Example: fetchSlots();
    };
    window.addEventListener('clinic-appointment-updated', handler);
    return () => window.removeEventListener('clinic-appointment-updated', handler);
  }, []);

  return (
    <div className="w-100" style={{ minHeight: '100vh', background: '#f8fafc', minWidth: 0 }}>
      {/* Header and Tabs */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <span className="fw-bold text-black" style={{ fontSize: 22 }}>Appointments</span>
          <div className="text-muted" style={{ fontSize: 14 }}>Manage physical health appointments</div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-success px-4 py-2 fw-semibold" style={{ borderRadius: 8, background: '#14b8a6', color: '#fff', border: 'none' }} onClick={() => setShowReferModal(true)}>Refer a student</button>
        </div>
      </div>
      <div className="d-flex align-items-center mb-4">
        <ul className="nav nav-pills w-100">
          <li className="nav-item flex-fill">
            <button
              className={`nav-link w-100 border ${pathname === '/clinic/appointment' ? 'bg-success text-white' : 'bg-light text-dark'}`}
              style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '8px 0 0 8px' }}
              onClick={() => router.push('/clinic/appointment')}
            >
              Calendar
            </button>
          </li>
          <li className="nav-item flex-fill">
            <button
              className={`nav-link w-100 border ${pathname === '/clinic/appointment/availability' ? 'bg-success text-white' : 'bg-light text-dark'}`}
              style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '0' }}
              onClick={() => router.push('/clinic/appointment/availability')}
            >
              Manage Availability
            </button>
          </li>
          <li className="nav-item flex-fill">
            <button
              className={`nav-link w-100 border ${pathname === '/clinic/appointment/schedule-lists' ? 'bg-success text-white' : 'bg-light text-dark'}`}
              style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '0 8px 8px 0' }}
              onClick={() => router.push('/clinic/appointment/schedule-lists')}
            >
              List of Schedules
            </button>
          </li>
        </ul>
      </div>
      {/* Main Content Card */}
      <div className="bg-white p-4 rounded shadow-sm" style={{ border: '1px solid #e5e7eb', width: '100%', maxWidth: '100%', margin: '0 auto', minHeight: 350, opacity: loading || saving ? 0.6 : 1 }}>
        {(loading || saving) && <div className="text-center mb-2"><span className="spinner-border spinner-border-sm" /> Loading...</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="fw-bold mb-1" style={{ fontSize: 20 }}>Manage Your Availability</div>
        <div className="text-muted mb-3" style={{ fontSize: 14 }}>Set your available time slots to book appointments</div>
        <div className="d-flex justify-content-end mb-3">
        </div>
        <div className="row g-3">
          {/* Always render all 10 slots, checked by default, update checked state after backend fetch */}
          {(() => {
            // Use slots if available, else fallback to defaultTimes (all checked)
            const slotMap = {};
            slots.forEach(slot => { slotMap[slot.time] = slot; });
            const amSlots = defaultTimes.filter(t => t.includes('AM')).map(time => slotMap[time] || { time, available: true });
            const pmSlots = defaultTimes.filter(t => t.includes('PM')).map(time => slotMap[time] || { time, available: true });
            const maxRows = Math.max(amSlots.length, pmSlots.length);
            return Array.from({ length: maxRows }).map((_, row) => (
              <div className="col-12" key={row}>
                <div className="d-flex gap-3 mb-2">
                  {/* AM column */}
                  {amSlots[row] ? (
                    <div className="d-flex align-items-center bg-light border rounded px-3 py-2" style={{ flex: 1, minWidth: 160, border: '1px solid #e5e7eb', background: '#f8fafc' }}>
                      <span className="me-2" style={{ color: '#6c757d', fontSize: 20 }}>
                        <i className="bi bi-clock"></i>
                      </span>
                      <span className="fw-semibold" style={{ fontSize: 16, flex: 1 }}>
                        {toDisplayTime(toHHMMSS(amSlots[row].time))}
                      </span>
                      <input
                        type="checkbox"
                        className="form-check-input ms-2"
                        checked={!!slots.find(s => s.time === toHHMMSS(amSlots[row].time) && s.available)}
                        onChange={() => handleToggle(amSlots[row].time)}
                        style={{ width: 22, height: 22, accentColor: '#22c55e' }}
                        disabled={loading || saving}
                      />
                    </div>
                  ) : <div style={{ flex: 1 }}></div>}
                  {/* PM column */}
                  {pmSlots[row] ? (
                    <div className="d-flex align-items-center bg-light border rounded px-3 py-2" style={{ flex: 1, minWidth: 160, border: '1px solid #e5e7eb', background: '#f8fafc' }}>
                      <span className="me-2" style={{ color: '#6c757d', fontSize: 20 }}>
                        <i className="bi bi-clock"></i>
                      </span>
                      <span className="fw-semibold" style={{ fontSize: 16, flex: 1 }}>
                        {toDisplayTime(toHHMMSS(pmSlots[row].time))}
                      </span>
                      <input
                        type="checkbox"
                        className="form-check-input ms-2"
                        checked={!!slots.find(s => s.time === toHHMMSS(pmSlots[row].time) && s.available)}
                        onChange={() => handleToggle(pmSlots[row].time)}
                        style={{ width: 22, height: 22, accentColor: '#22c55e' }}
                        disabled={loading || saving}
                      />
                    </div>
                  ) : <div style={{ flex: 1 }}></div>}
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
      {/* Refer a student Modal */}
      {showReferModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.18)", position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 540, width: "100%" }}>
            <div className="modal-content modal-light-green-background p-4" style={{ borderRadius: 16, boxShadow: "0 4px 32px rgba(0,0,0,0.10)", background: "#e6f0ea" }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">Refer Student</h5>
              </div>
              <div className="mb-3" style={{ fontSize: 15, color: "#222" }}>Refer a student to nurse or counselor</div>
              <form onSubmit={async e => {
                e.preventDefault();
                setError(null);
                try {
                  // Find selected student and provider objects
                  const studentObj = students.find(s => s.full_name === referStudentName);
                  const providerObj = providers.find(p => String(p.id) === String(referTo));
                  if (!studentObj || !providerObj) throw new Error('Please select a valid student and provider.');
                  let serviceType = '';
                  if (providerObj.role === 'clinic') serviceType = 'physical';
                  else if (providerObj.role === 'counselor') serviceType = 'mental';
                  // Always send date as YYYY-MM-DD string (no Date object)
                  const safeDate = referDate;
                  await createAppointment({
                    provider_id: providerObj.id,
                    client_id: studentObj.id,
                    date: safeDate, // always YYYY-MM-DD
                    time: referTime,
                    reason: referNotes,
                    service_type: serviceType,
                    referral: 'Direct'
                  });
                  // Optionally refresh slots/appointments if needed
                  setShowReferModal(false);
                  // Real-time update: dispatch event
                  window.dispatchEvent(new Event('clinic-appointment-updated'));
                } catch (err) {
                  setError(err.message || 'Failed to send referral.');
                }
              }}>
                <div className="mb-3" style={{ position: 'relative' }}>
                  <label className="form-label fw-semibold">Student Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={referStudentName}
                    onChange={handleStudentSearch}
                    onFocus={() => setStudentDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setStudentDropdownOpen(false), 150)}
                    placeholder="Search student name..."
                    autoComplete="off"
                    required
                  />
                  {studentDropdownOpen && referStudentName.length > 0 && filteredStudents.length > 0 && (
                    <ul className="list-group position-absolute w-100" style={{ zIndex: 10, maxHeight: 180, overflowY: 'auto', top: '100%', background: '#e6f0ea', border: '1px solid #ced4da' }}>
                      {filteredStudents.map(s => (
                        <li
                          key={s.id}
                          className="list-group-item list-group-item-action"
                          style={{ cursor: 'pointer', background: '#e6f0ea', border: 'none' }}
                          onMouseDown={() => { setReferStudentName(s.full_name); setStudentDropdownOpen(false); }}
                        >
                          {s.full_name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Refer to</label>
                  <select className="form-select" value={referTo} onChange={e => setReferTo(e.target.value)} required>
                    <option value="">Select provider to refer to</option>
                    {providers.map(p => (
                      <option key={p.id} value={p.id}>{p.role === 'clinic' ? `Nurse ${p.full_name}` : p.role === 'counselor' ? `Counselor ${p.full_name}` : p.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Date</label>
                  <input type="date" className="form-control" value={referDate} onChange={e => setReferDate(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Time</label>
                  <select className="form-select" value={referTime} onChange={e => setReferTime(e.target.value)} required>
                    <option value="">Select a time slot</option>
                    {referAvailableTimes.filter(t => allowedTimes.includes(t.split(':').slice(0,2).join(':'))).map(t => (
                      <option key={t} value={t}>{to12Hour(t.split(':').slice(0,2).join(':'))}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="form-label fw-semibold">Reason</label>
                  <input type="text" className="form-control" value={referNotes} onChange={e => setReferNotes(e.target.value)} placeholder="Reason for referral" />
                </div>
                <div className="d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-cancel-light-green px-4" onClick={() => setShowReferModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success px-4">Send Referral</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        .btn-cancel-light-green {
          background-color: #e6f0ea !important;
          color: #171717 !important;
          border: 2px solid #38813A !important;
          font-weight: 600 !important;
          transition: background 0.2s, color 0.2s, border 0.2s;
        }
        .btn-cancel-light-green:hover, .btn-cancel-light-green:focus {
          background-color: #d1e7dd !important;
          color: #222 !important;
          border: 2.5px solid #2e7d32 !important;
        }
      `}</style>
    </div>
  );
}
