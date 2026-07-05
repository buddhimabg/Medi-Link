import { useState, useEffect } from 'react'
import './App.css'

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './component/loginPage'
import VideoCallScreen from './pages/VideoCall/VideoCallScreen'
import VideoCallSetting from './pages/VideoCall/VideoCallSetting';
import ChatbotPage from './pages/Chatbot/Chatbotpage'
import ComingSoonPage from './pages/Common/ComingSoonPage'
import JournalsRouter from './pages/Journals/JournalsRouter'
import { clearToken } from './types/api'

// Generate a stable session ID from doctor's user ID
// Format: doc-<last 6 chars of userId> — unique per doctor, stable across refreshes
const buildSessionId = (userId: string): string => {
  const suffix = userId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()
  return suffix.length >= 4 ? `doc-${suffix}` : `doc-${Date.now().toString(36).toUpperCase()}`
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('medilink_logged_in') === 'true'
  })

  const [userRole, setUserRole] = useState<string>(() => {
    try {
      const info = localStorage.getItem('medilink_user_info')
      return info ? JSON.parse(info).role : 'doctor'
    } catch { return 'doctor' }
  })

  const [userName, setUserName] = useState<string>(() => {
    try {
      const info = localStorage.getItem('medilink_user_info')
      return info ? JSON.parse(info).name : ''
    } catch { return '' }
  })

  // Dynamic session ID — built from doctor's real user ID (no hardcoding)
  const [doctorSessionId, setDoctorSessionId] = useState<string>('')

  useEffect(() => {
    try {
      const info = localStorage.getItem('medilink_user_info')
      if (info) {
        const parsed = JSON.parse(info)
        if (parsed.role === 'doctor' && parsed.id) {
          setDoctorSessionId(buildSessionId(parsed.id))
        }
      }
    } catch { /* ignore */ }
  }, [isLoggedIn])

  const handleLoginSuccess = (_email: string, role: string) => {
    setIsLoggedIn(true)
    setUserRole(role)
    try {
      const info = localStorage.getItem('medilink_user_info')
      if (info) {
        const parsed = JSON.parse(info)
        setUserName(parsed.name ?? '')
        // Build session ID immediately after login
        if (role === 'doctor' && parsed.id) {
          setDoctorSessionId(buildSessionId(parsed.id))
        }
      }
    } catch { /* ignore */ }
  }

  const handleLogout = () => {
    clearToken()
    localStorage.removeItem('medilink_user_info')
    localStorage.removeItem('medilink_logged_in')
    setIsLoggedIn(false)
    setUserRole('doctor')
    setUserName('')
    setDoctorSessionId('')
  }

  // Doctor default redirect — use dynamic sessionId
  const defaultDoctorPath = doctorSessionId
    ? `/video-call/${doctorSessionId}`
    : '/video-call'

  const defaultRedirect = userRole === 'patient' ? '/patient-home' : defaultDoctorPath

  return (
    <BrowserRouter>
      <Routes>

        {/* ── Login ── */}
        <Route
          path="/login"
          element={
            isLoggedIn
              ? <Navigate to={defaultRedirect} />
              : <Login onLoginSuccess={handleLoginSuccess} />
          }
        />

        {/* ── Video Call — dynamic :sessionId from URL ── */}
        <Route
          path="/video-call/:sessionId"
          element={isLoggedIn
            ? <VideoCallScreen onLogout={handleLogout} userName={userName} />
            : <Navigate to="/login" />}
        />

        <Route 
  path="/VideoCallSetting" 
  element={isLoggedIn ? <VideoCallSetting /> : <Navigate to="/login" />} 
/>

        {/* ── Video Call — no sessionId, redirect to doctor's session ── */}
        <Route
          path="/video-call"
          element={
            isLoggedIn
              ? doctorSessionId
                ? <Navigate to={`/video-call/${doctorSessionId}`} />
                : <VideoCallScreen onLogout={handleLogout} userName={userName} />
              : <Navigate to="/login" />
          }
        />

        {/* ── Journals ── */}
        <Route
          path="/journals/*"
          element={isLoggedIn
            ? <JournalsRouter />
            : <Navigate to="/login" />}
        />

        {/* ── Dashboard ── */}
        <Route
          path="/dashboard"
          element={isLoggedIn
            ? <ComingSoonPage title="Dashboard" subtitle="Overview widgets and metrics are being prepared for you." activePath="/dashboard" />
            : <Navigate to="/login" />}
        />

        {/* ── Schedule ── */}
        <Route
          path="/schedule"
          element={isLoggedIn
            ? <ComingSoonPage title="Schedule" subtitle="Appointment scheduling and calendar tools are coming soon." activePath="/schedule" />
            : <Navigate to="/login" />}
        />

        {/* ── Patients ── */}
        <Route
          path="/patients"
          element={isLoggedIn
            ? <ComingSoonPage title="Patient Management" subtitle="Patient records and management tools are under development." activePath="/patients" />
            : <Navigate to="/login" />}
        />

        {/* ── Chatbot ── */}
        <Route
          path="/chatbot"
          element={isLoggedIn ? <ChatbotPage /> : <Navigate to="/login" />}
        />

        {/* ── Patient Home ── */}
        <Route
          path="/patient-home"
          element={isLoggedIn
            ? <ComingSoonPage title="Patient Portal" subtitle="Your appointments, prescriptions and health records." activePath="/patient-home" />
            : <Navigate to="/login" />}
        />

        {/* ── Default ── */}
        <Route path="/" element={<Navigate to="/login" />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App