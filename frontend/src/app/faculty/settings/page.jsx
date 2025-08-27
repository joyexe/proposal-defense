'use client';
import React, { useState, useEffect } from "react";
import { getUserProfile, fetchWithAuth } from "../../utils/api";

export default function FacultySettingsPage() {
  const [form, setForm] = useState({
    facultyId: "",
    name: "",
    gender: "",
    dob: "",
    mobile: "",
    email: "",
    residential: "",
    permanent: ""
  });

  useEffect(() => {
    getUserProfile().then(profile => {
      setForm(f => ({
        ...f,
        facultyId: profile.faculty_id || "",
        name: profile.full_name || "",
        email: profile.email || "",
        gender: profile.gender || "",
        dob: profile.dob || "",
        mobile: profile.mobile || "",
        residential: profile.residential || "",
        permanent: profile.permanent || "",
      }));
    });
    // Optionally, add a focus event listener to refetch on tab focus
    const handleFocus = () => {
      getUserProfile().then(profile => {
        setForm(f => ({
          ...f,
          facultyId: profile.faculty_id || "",
          name: profile.full_name || "",
          email: profile.email || "",
          gender: profile.gender || "",
          dob: profile.dob || "",
          mobile: profile.mobile || "",
          residential: profile.residential || "",
          permanent: profile.permanent || "",
        }));
      });
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetchWithAuth('http://127.0.0.1:8080/api/user/profile/', {
        method: 'PATCH',
        body: {
          faculty_id: form.facultyId,
          gender: form.gender,
          dob: form.dob,
          mobile: form.mobile,
          residential: form.residential,
          permanent: form.permanent,
        },
      });
      // Fetch the latest data and update the form
      const updatedProfile = await getUserProfile();
      setForm(f => ({
        ...f,
        facultyId: updatedProfile.faculty_id || "",
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

  return (
    <div className="container-fluid px-0" style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <div className="pt-4 px-4 mb-0">
        <span className="fw-bold text-black mb-1 d-block" style={{ fontSize: 22 }}>Settings</span>
        <div className="text-muted mb-4" style={{ fontSize: '1rem' }}>
          Manage your account settings and preferences
        </div>
      </div>
      <div className="d-flex justify-content-center w-100 mt-0">
        <form className="bg-white rounded shadow-sm p-4 w-100" style={{ borderRadius: 16, width: '100%' }} onSubmit={handleSubmit}>
          <div className="fw-bold mb-1" style={{ fontSize: 20 }}>Personal Information</div>
          <div className="text-muted mb-4" style={{ fontSize: 14 }}>Update your personal information and profile details</div>
          <div className="row g-4">
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label mb-1">Faculty ID</label>
                <input type="text" className="form-control" name="facultyId" value={form.facultyId} disabled />
              </div>
              <div className="mb-3">
                <label className="form-label mb-1">Name</label>
                <input type="text" className="form-control" name="name" value={form.name} disabled />
              </div>
              <div className="mb-3">
                <label className="form-label mb-1">Gender</label>
                <input type="text" className="form-control" name="gender" value={form.gender} onChange={handleChange} required />
              </div>
              <div className="mb-3">
                <label className="form-label mb-1">Date of Birth</label>
                <input type="date" className="form-control" name="dob" value={form.dob} onChange={handleChange} required />
              </div>
              <div className="mb-3">
                <label className="form-label mb-1">Mobile No.</label>
                <input type="text" className="form-control" name="mobile" value={form.mobile} onChange={handleChange} required />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label mb-1">Email Address</label>
                <input type="email" className="form-control" name="email" value={form.email} disabled />
              </div>
              <div className="mb-3">
                <label className="form-label mb-1">Residential Address</label>
                <input type="text" className="form-control" name="residential" value={form.residential} onChange={handleChange} required />
              </div>
              <div className="mb-3">
                <label className="form-label mb-1">Permanent Address</label>
                <input type="text" className="form-control" name="permanent" value={form.permanent} onChange={handleChange} required />
              </div>
            </div>
          </div>
          <div className="d-flex justify-content-end mt-3">
            <button className="btn btn-success px-4" style={{ fontWeight: 500, fontSize: 15 }} type="submit">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
