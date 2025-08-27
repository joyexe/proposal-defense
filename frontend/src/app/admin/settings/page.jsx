"use client";
import { useState, useEffect, useContext } from "react";
import { getSystemTheme, setSystemTheme, getUserProfile, fetchWithAuth } from "../../utils/api";
import { useTheme } from "../../components/ThemeContext";

export default function AdminSettingsPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState("general");

  // General Settings states
  const [appName, setAppName] = useState("Amieti v2.4.1");
  const [timezone, setTimezone] = useState("UTC+00:00 | English");
  const [backupFreq, setBackupFreq] = useState("Daily");
  const [maintenance, setMaintenance] = useState(false);
  const [enableAnalytics, setEnableAnalytics] = useState(true);
  const [enableBeta, setEnableBeta] = useState(false);

  // Security & Compliance states
  const [passwordReq, setPasswordReq] = useState("Minimum of 8 characters");
  const [enable2FA, setEnable2FA] = useState(true);
  const [twoFAType, setTwoFAType] = useState("Requires Google Auth");
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [ipWhitelist, setIpWhitelist] = useState("192.0.2.0\n198.51.100.0");
  const [encryption, setEncryption] = useState(true);

  // Roles & Permissions states
  const [roles, setRoles] = useState([
    { role: "Student", view: true, edit: true, config: true },
    { role: "Faculty", view: true, edit: false, config: true },
    { role: "Nurse", view: true, edit: true, config: true },
    { role: "Counselor", view: true, edit: true, config: true },
    { role: "Admin", view: true, edit: true, config: false },
  ]);

  // Add state for personal info
  const [personalInfo, setPersonalInfo] = useState({
    adminId: "",
    name: "",
    gender: "",
    dob: "",
    mobile: "",
    email: "",
    residential: "",
    permanent: ""
  });
  useEffect(() => {
    if (activeTab === "personal") {
          getUserProfile().then(profile => {
      setPersonalInfo(f => ({
        ...f,
        adminId: profile.faculty_id || "",
        name: profile.full_name || "",
        email: profile.email || "",
        gender: profile.gender || "",
        dob: profile.dob || "",
        mobile: profile.mobile || "",
        residential: profile.residential || "",
        permanent: profile.permanent || "",
      }));
    });
    }
  }, [activeTab]);
  const handlePersonalChange = (e) => {
    setPersonalInfo({ ...personalInfo, [e.target.name]: e.target.value });
  };
  const handlePersonalSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetchWithAuth('http://127.0.0.1:8080/api/user/profile/', {
        method: 'PATCH',
        body: {
          faculty_id: personalInfo.adminId,
          gender: personalInfo.gender,
          dob: personalInfo.dob,
          mobile: personalInfo.mobile,
          residential: personalInfo.residential,
          permanent: personalInfo.permanent,
        },
      });
      // Fetch the latest data and update the form
      const updatedProfile = await getUserProfile();
      setPersonalInfo(f => ({
        ...f,
        adminId: updatedProfile.faculty_id || "",
        name: updatedProfile.full_name || "",
        email: updatedProfile.email || "",
        gender: updatedProfile.gender || "",
        dob: updatedProfile.dob || "",
        mobile: updatedProfile.mobile || "",
        residential: updatedProfile.residential || "",
        permanent: updatedProfile.permanent || "",
      }));
      alert('Personal information saved successfully!');
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  };

  const { theme, setTheme } = useTheme();

  // Handlers for toggles
  const handleRoleToggle = (idx, key) => {
    setRoles(prev => prev.map((r, i) => i === idx ? { ...r, [key]: !r[key] } : r));
  };

  return (
    <div className="card w-100" style={{ borderRadius: 16, border: 'none' }}>
      <div className="card-body p-0">
        {/* Tabs */}
        <ul className="nav nav-tabs px-4 pt-3" style={{ borderBottom: 'none' }}>
          <li className="nav-item">
            <button className={`nav-link custom-top-tab${activeTab === "general" ? " active" : ""}`} onClick={() => setActiveTab("general")} style={{ fontSize: 16, minWidth: 160 }}>General Settings</button>
          </li>
          <li className="nav-item">
            <button className={`nav-link custom-top-tab${activeTab === "roles" ? " active" : ""}`} onClick={() => setActiveTab("roles")} style={{ fontSize: 16, minWidth: 180 }}>Roles & Permission</button>
          </li>
          <li className="nav-item">
            <button className={`nav-link custom-top-tab${activeTab === "personal" ? " active" : ""}`} onClick={() => setActiveTab("personal")} style={{ fontSize: 16, minWidth: 180 }}>Personal Information</button>
          </li>
        </ul>
        <div className="px-4 py-4">
          {activeTab === "general" && (
            <>
              {/* System Configuration */}
              <div className="mb-4">
                <div className="fw-bold mb-3" style={{ fontSize: 18 }}>System Configuration</div>
                <div className="row g-4">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">App Name/Version:</label>
                      <input type="text" className="form-control" value={appName} onChange={e => setAppName(e.target.value)} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Time Zone & Language:</label>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <select className="form-select" value={timezone} onChange={e => setTimezone(e.target.value)} style={{ paddingRight: 32, appearance: 'none', borderRadius: 8 }}>
                          <option>UTC+00:00 | English</option>
                          <option>UTC+08:00 | Filipino</option>
                        </select>
                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 16, color: '#888' }}>
                          <i className="bi bi-chevron-down"></i>
                        </span>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Backup Frequency:</label>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <select className="form-select" value={backupFreq} onChange={e => setBackupFreq(e.target.value)} style={{ paddingRight: 32, appearance: 'none', borderRadius: 8 }}>
                          <option>Daily</option>
                          <option>Weekly</option>
                          <option>Monthly</option>
                        </select>
                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 16, color: '#888' }}>
                          <i className="bi bi-chevron-down"></i>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    {/* Theme */}
                    <div className="mb-3">
                      <label className="form-label mb-1">Theme:</label>
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" checked={theme === "light"} onChange={() => setTheme(theme === "light" ? "dark" : "light")} id="themeSwitch" />
                        <label className="form-check-label ms-2" htmlFor="themeSwitch">{theme === "light" ? "Light" : "Dark"}</label>
                      </div>
                    </div>
                    {/* Maintenance Mode */}
                    <div className="mb-3">
                      <label className="form-label mb-1">Maintenance Mode:</label>
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" checked={maintenance} onChange={() => setMaintenance(v => !v)} id="maintenanceSwitch" />
                        <label className="form-check-label ms-2" htmlFor="maintenanceSwitch">On/Off</label>
                      </div>
                    </div>
                    {/* Feature Toggles */}
                    <div className="mb-3">
                      <label className="form-label mb-1">Feature Toggles:</label>
                      <div>
                        <div className="form-check form-switch mb-2">
                          <input className="form-check-input" type="checkbox" checked={enableAnalytics} onChange={() => setEnableAnalytics(v => !v)} id="analyticsSwitch" />
                          <label className="form-check-label ms-2" htmlFor="analyticsSwitch">Enable Analytics</label>
                        </div>
                        <div className="form-check form-switch">
                          <input className="form-check-input" type="checkbox" checked={enableBeta} onChange={() => setEnableBeta(v => !v)} id="betaSwitch" />
                          <label className="form-check-label ms-2 text-muted" htmlFor="betaSwitch" style={{ color: '#adb5bd' }}>Beta Features</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Security & Compliance */}
              <div className="mt-4">
                <div className="fw-bold mb-3" style={{ fontSize: 18 }}>Security & Compliance</div>
                <div className="row g-4">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Password Requirements:</label>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <select className="form-select" value={passwordReq} onChange={e => setPasswordReq(e.target.value)} style={{ paddingRight: 32, appearance: 'none', borderRadius: 8 }}>
                          <option>Minimum of 8 characters</option>
                          <option>Minimum of 12 characters</option>
                          <option>Alphanumeric + Symbol</option>
                        </select>
                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 16, color: '#888' }}>
                          <i className="bi bi-chevron-down"></i>
                        </span>
                      </div>
                    </div>
                    <div className="mb-3 d-flex align-items-center justify-content-between">
                      <label className="form-label mb-0">Enable 2FA:</label>
                      <div className="form-check form-switch ms-2">
                        <input className="form-check-input" type="checkbox" checked={enable2FA} onChange={() => setEnable2FA(v => !v)} id="twoFASwitch" />
                      </div>
                    </div>
                    <div className="mb-3">
                      <div style={{ position: 'relative', width: '100%' }}>
                        <select className="form-select" value={twoFAType} onChange={e => setTwoFAType(e.target.value)} disabled={!enable2FA} style={{ paddingRight: 32, appearance: 'none', borderRadius: 8 }}>
                          <option>Requires Google Auth</option>
                          <option>Requires SMS</option>
                        </select>
                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 16, color: '#888' }}>
                          <i className="bi bi-chevron-down"></i>
                        </span>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Session Timeout:</label>
                      <input type="number" className="form-control" value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)} min={1} />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">IP Whitelisting:</label>
                      <textarea className="form-control" rows={2} value={ipWhitelist} onChange={e => setIpWhitelist(e.target.value)} />
                    </div>
                    <div className="mb-3 d-flex align-items-center justify-content-between">
                      <label className="form-label mb-0">Encryption:</label>
                      <div className="form-check form-switch ms-2">
                        <input className="form-check-input" type="checkbox" checked={encryption} onChange={() => setEncryption(v => !v)} id="encryptionSwitch" />
                        <span className="ms-2" style={{ color: encryption ? '#198754' : '#dc3545' }}>
                          <i className={`bi ${encryption ? 'bi-lock-fill' : 'bi-unlock'}`}></i>
                        </span>
                      </div>
                    </div>
                    <button className="btn btn-success mt-2" style={{ minWidth: 240, fontWeight: 500 }}>Download Compliance Report</button>
                  </div>
                </div>
              </div>
            </>
          )}
          {activeTab === "roles" && (
            <>
              <div className="fw-bold mb-1" style={{ fontSize: 20 }}>Roles and Permissions Management</div>
              <div className="text-muted mb-4" style={{ fontSize: 14 }}>Control users permissions</div>
              <div className="table-responsive">
                <table className="table align-middle" style={{ minWidth: 600, border: 'none' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ fontWeight: 600, border: 'none' }}>Role</th>
                      <th className="text-center" style={{ fontWeight: 600, border: 'none' }}>View Health Records</th>
                      <th className="text-center" style={{ fontWeight: 600, border: 'none' }}>Edit Health Records</th>
                      <th className="text-center" style={{ fontWeight: 600, border: 'none' }}>System Configuration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((r, idx) => (
                      <tr key={r.role} style={{ border: 'none' }}>
                        <td style={{ border: 'none' }}>{r.role}</td>
                        <td className="text-center" style={{ border: 'none' }}>
                          <div className="form-check form-switch d-inline-block">
                            <input className="form-check-input" type="checkbox" checked={r.view} onChange={() => handleRoleToggle(idx, 'view')} />
                          </div>
                        </td>
                        <td className="text-center" style={{ border: 'none' }}>
                          <div className="form-check form-switch d-inline-block">
                            <input className="form-check-input" type="checkbox" checked={r.edit} onChange={() => handleRoleToggle(idx, 'edit')} />
                          </div>
                        </td>
                        <td className="text-center" style={{ border: 'none' }}>
                          <div className="form-check form-switch d-inline-block">
                            <input className="form-check-input" type="checkbox" checked={r.config} onChange={() => handleRoleToggle(idx, 'config')} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="d-flex justify-content-end mt-3">
                <button className="btn btn-success px-4" style={{ minWidth: 120, fontWeight: 500 }}>Save changes</button>
              </div>
            </>
          )}
          {activeTab === "personal" && (
            <form className="p-0 w-100" style={{ borderRadius: 0, background: 'transparent', boxShadow: 'none' }} onSubmit={handlePersonalSubmit}>
              <div className="fw-bold mb-1" style={{ fontSize: 20 }}>Personal Information</div>
              <div className="text-muted mb-4" style={{ fontSize: 14 }}>Update your personal information and profile details</div>
                             <div className="row g-4">
                 <div className="col-md-6">
                   <div className="mb-3">
                     <label className="form-label mb-1">Admin ID</label>
                     <input type="text" className="form-control" name="adminId" value={personalInfo.adminId} disabled />
                   </div>
                   <div className="mb-3">
                     <label className="form-label mb-1">Name</label>
                     <input type="text" className="form-control" name="name" value={personalInfo.name} disabled />
                   </div>
                  <div className="mb-3">
                    <label className="form-label mb-1">Gender</label>
                    <input type="text" className="form-control" name="gender" value={personalInfo.gender} onChange={handlePersonalChange} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label mb-1">Date of Birth</label>
                    <input type="date" className="form-control" name="dob" value={personalInfo.dob} onChange={handlePersonalChange} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label mb-1">Mobile No.</label>
                    <input type="text" className="form-control" name="mobile" value={personalInfo.mobile} onChange={handlePersonalChange} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label mb-1">Email Address</label>
                    <input type="email" className="form-control" name="email" value={personalInfo.email} disabled />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label mb-1">Residential Address</label>
                    <input type="text" className="form-control" name="residential" value={personalInfo.residential} onChange={handlePersonalChange} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label mb-1">Permanent Address</label>
                    <input type="text" className="form-control" name="permanent" value={personalInfo.permanent} onChange={handlePersonalChange} required />
                  </div>
                </div>
              </div>
              <div className="d-flex justify-content-end mt-3">
                <button className="btn btn-success px-4" style={{ fontWeight: 500, fontSize: 15 }} type="submit">Save</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
