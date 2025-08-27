import { useState } from 'react';
import { BsChat, BsThreeDots } from 'react-icons/bs';
import ChatbotWindow from './AmietiChatbot';

export default function ChatbotFloatingIcon() {
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <ChatbotWindow onClose={() => setOpen(false)} />}
      <div
        style={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          zIndex: 9999,
          width: 64,
          height: 64,
          borderRadius: '50%',
          boxShadow: '0 4px 16px rgba(60,140,108,0.18)',
          background: '#20bfa9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          border: 'none',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setOpen(true)}
      >
        <div style={{ position: 'relative', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BsChat size={36} color="#fff" />
          {hovered && (
            <BsThreeDots size={16} color="#fff" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
          )}
        </div>
      </div>
    </>
  );
} 