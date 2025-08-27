"use client";
import { useState, useEffect } from "react";
import { fetchWithAuth } from "../../utils/api";

export default function MedicalExaminationPage() {
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  // Fetch students (from website/users/students API)
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setError("");
        const response = await fetchWithAuth(
          "http://127.0.0.1:8080/api/website/users/students/"
        );

        const allStudents = Array.isArray(response) ? response : [];

        setStudents(allStudents);

        // Extract unique grades and sections from database
        const uniqueGrades = [
          ...new Set(allStudents.map((s) => s.grade).filter(Boolean)),
        ].sort();
        setGrades(uniqueGrades);
        
        const uniqueSections = [
          ...new Set(allStudents.map((s) => s.section).filter(Boolean)),
        ].sort();
        setSections(uniqueSections);
      } catch (err) {
        console.error("Error fetching students:", err);
        setError("Failed to load students. Please try again.");
      }
    };

    fetchStudents();
  }, []);

  // handle file select
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // send file to backend OCR API
  const handleUpload = async () => {
    if (!file) return alert("Please select a file first.");
    if (!selectedStudent) return alert("Please select a student first.");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("student_id", selectedStudent);

    try {
      setLoading(true);
      setError("");
      // Use the consolidated medical exam backend endpoint
      const res = await fetch("http://127.0.0.1:8080/api/medical-exams/ocr/", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const result = await res.json();

      setData(result);
    } catch (err) {
      console.error(err);
      setError("Error uploading/processing file. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Ensure required fields exist
    const requiredFields = ["first_name", "last_name", "dob"];
    for (let field of requiredFields) {
      if (!data[field]) return alert(`Please fill in ${field.replace("_", " ")}`);
    }

    try {
      setError("");
      const res = await fetch("http://127.0.0.1:8080/api/medical-exams/", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Save failed");
      alert("Student health record saved!");
      setData(null);
      setFile(null);
      setSelectedStudent("");
    } catch (err) {
      console.error(err);
      setError("Error saving data. Please try again.");
    }
  };

  // handle field edits
  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  // Filter students based on grade and section
  const filteredStudents = students.filter((s) => {
    if (selectedGrade && s.grade !== selectedGrade) return false;
    if (selectedSection && s.section !== selectedSection) return false;
    return true;
  });

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <span className="fw-bold text-black" style={{ fontSize: 24 }}>
            Medical Examination Forms
          </span>
          <div className="text-muted" style={{ fontSize: 14 }}>
            Upload and process student medical examination forms using OCR technology
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-danger mb-4" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {/* If no OCR data yet */}
      {!data && (
        <div className="mb-10 space-y-16" style={{ maxWidth: 2000 }}>
          {/* Box 1: Grade + Student Selection */}
          <div
            className="p-5 border rounded bg-white shadow-sm mb-6"
            style={{ borderRadius: 12 }}
          >
            <h5 className="fw-bold mb-4">Select Student</h5>
            <div className="d-flex" style={{ gap: 20, flexWrap: "wrap" }}>
              {/* Grade Dropdown */}
               <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <label className="form-label fw-semibold mb-2">All Grades</label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="form-select"
                    style={{ height: 40, borderRadius: 8, appearance: 'none', paddingRight: 32 }}
                >
                  <option value="">-- All Grades --</option>
                  {grades.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Dropdown */}
               <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <label className="form-label fw-semibold mb-2">All Sections</label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="form-select"
                    style={{ height: 40, borderRadius: 8, appearance: 'none', paddingRight: 32 }}
                >
                  <option value="">-- All Sections --</option>
                  {sections.map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Dropdown */}
               <div style={{ position: 'relative', flex: 2, minWidth: 350 }}>
                <label className="form-label fw-semibold mb-2">Select Student</label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="form-select"
                    style={{ height: 40, borderRadius: 8, appearance: 'none', paddingRight: 32 }}
                >
                  <option value="">-- Select Student --</option>
                  {filteredStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                       {student.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            
          </div>

          {/* Box 2: Upload Section */}
          <div
            className="p-5 border rounded bg-white shadow-sm text-center"
            style={{ borderRadius: 12, marginTop: 32 }}
          >
            <div className="mb-4">
              <i className="bi bi-file-earmark-text" style={{ fontSize: 48, color: '#198754' }}></i>
            </div>
            <h5 className="fw-bold mb-4">Upload Medical Exam Form</h5>
            <p className="text-muted mb-4">
              Upload a scanned or photographed medical examination form. 
              Our enhanced OCR system will extract all text from the form.
            </p>
            <div className="mb-4">
              <input
                type="file"
                onChange={handleFileChange}
                className="form-control"
                accept="image/*,.pdf"
                style={{ maxWidth: 400, margin: '0 auto' }}
              />
              <small className="text-muted d-block mt-2">
                Supported formats: JPG, PNG, PDF (max 10MB)
              </small>
            </div>
            <button
              onClick={handleUpload}
              disabled={loading || !selectedStudent}
              className={`btn btn-success btn-lg px-4 ${loading || !selectedStudent ? "disabled" : ""}`}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Processing with OCR...
                </>
              ) : (
                <>
                  <i className="bi bi-upload me-2"></i>
                  Upload & Extract
                </>
              )}
            </button>
            {loading && (
              <div className="mt-3">
                <div className="progress mb-2" style={{ height: 6 }}>
                  <div 
                    className="progress-bar progress-bar-striped progress-bar-animated" 
                    role="progressbar" 
                    style={{ width: '100%' }}
                  ></div>
                </div>
                <small className="text-muted">
                  <i className="bi bi-info-circle me-1"></i>
                  Processing image with enhanced OCR... This may take 10-30 seconds
                </small>
              </div>
            )}
          </div>
        </div>
      )}

      {/* If OCR data exists */}
      {data && (
        <div className="mt-6">
          <div className="card">
            <div className="card-header bg-success text-white">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-0">
                    <i className="bi bi-check-circle me-2"></i>
                    Medical Form OCR Results
                  </h4>
                  <p className="mb-0 mt-1" style={{ fontSize: 14 }}>
                    Review and edit the extracted text below
                  </p>
                </div>
                <div className="text-end">
                  <small className="d-block">
                    <strong>Processing Method:</strong> {data.processing_method || 'Enhanced OCR'}
                  </small>
                  <small className="d-block">
                    <strong>File:</strong> {data.file_name || 'Unknown'}
                  </small>
                  {data.extraction_timestamp && (
                    <small className="d-block">
                      <strong>Extracted:</strong> {new Date(data.extraction_timestamp).toLocaleString()}
                    </small>
                  )}
                </div>
              </div>
            </div>
            <div className="card-body">
              {/* Medical Form Display */}
              <div className="mb-4">
                <h5 className="fw-bold text-primary mb-3">
                  <i className="bi bi-file-text me-2"></i>
                  Extracted Medical Form Data
                </h5>
                
                {/* Editable Form Display */}
                <div className="mt-4">
                  <div 
                    className="form-control"
                    contentEditable={true}
                    onInput={(e) => setData({ ...data, raw_text: e.currentTarget.textContent })}
                    style={{ 
                      fontFamily: 'monospace', 
                      fontSize: '13px',
                      lineHeight: '1.4',
                      whiteSpace: 'pre-wrap',
                      minHeight: '400px',
                      padding: '20px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      backgroundColor: '#fff',
                      overflowY: 'auto'
                    }}
                    suppressContentEditableWarning={true}
                  >
                    {data.raw_text || "Extracted text will appear here..."}
                  </div>
                </div>
                  
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-info-circle me-1"></i>
                      The text above shows the raw OCR extraction in a form-like layout. You can edit it in the textarea below if corrections are needed.
                    </small>
                  </div>
                </div>

                <div className="mt-4 d-flex gap-3">
                <button
                  onClick={handleSave}
                  className="btn btn-success px-4 py-2"
                >
                  <i className="bi bi-check-circle me-2"></i>
                  Confirm & Save
                </button>
                <button
                  onClick={() => setData(null)}
                  className="btn btn-secondary px-4 py-2"
                >
                  <i className="bi bi-x-circle me-2"></i>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
