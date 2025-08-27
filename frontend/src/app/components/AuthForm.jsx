'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function AuthForm({ fields, onSubmit, submitText, loading, message, links }) {
  const [formData, setFormData] = useState(
    fields.reduce((acc, field) => ({ ...acc, [field.name]: '' }), {})
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        {fields.map((field) => (
          <div className="mb-3" key={field.name}>
            <label className="form-label fw-bold">{field.label}</label>
            <input
              type={field.type || 'text'}
              className="form-control border-2 py-2"
              name={field.name}
              value={formData[field.name]}
              onChange={handleChange}
              placeholder={field.placeholder}
              required={field.required !== false}
            />
          </div>
        ))}

        <div className="d-grid gap-2 mt-4">
          <button 
            type="submit" 
            className="btn btn-primary py-2 fw-bold"
            disabled={loading}
          >
            {loading ? 'Processing...' : submitText}
          </button>
        </div>

        {links && (
          <div className="mt-3 text-center">
            {links.map((link, index) => (
              <div key={index}>
                <Link href={link.href} className="text-decoration-none">
                  {link.text}
                </Link>
              </div>
            ))}
          </div>
        )}
      </form>

      {message && (
        <div className={`mt-3 alert ${message.startsWith('✓') ? 'alert-success' : 'alert-danger'}`}>
          {message}
        </div>
      )}
    </>
  );
}