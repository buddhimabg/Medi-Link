// src/pages/VideoCall/ConsentModal.tsx
import React from 'react'

interface Props {
  role: 'doctor' | 'patient'
  onAgree: () => void
  onDecline: () => void
}

const ConsentModal: React.FC<Props> = ({ role, onAgree, onDecline }) => {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      }}
    >
      <div
        style={{
          background: '#fff', borderRadius: 16, padding: '28px 26px',
          maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ fontSize: 30, marginBottom: 10 }}>🎥</div>
        <h3 style={{ margin: '0 0 10px', fontSize: 17, color: '#1A1A2E' }}>
          Session Recording Consent
        </h3>
        <p style={{ fontSize: 13.5, color: '#4B5563', lineHeight: 1.6, margin: '0 0 20px' }}>
          This consultation will be recorded and securely saved to the patient's
          medical history for future reference. Only the {role === 'doctor' ? 'patient' : 'doctor'}{' '}
          involved in this session and you will be able to view or download it.
          Do you agree to proceed with recording?
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onDecline}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 10, border: '1.5px solid #E5E7EB',
              background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: 13.5,
            }}
          >
            Decline
          </button>
          <button
            onClick={onAgree}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 10, border: 'none',
              background: '#2B52D4', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13.5,
            }}
          >
            I Agree
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConsentModal