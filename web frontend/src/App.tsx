import { useState } from 'react'
import './App.css'

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './component/loginPage'
import VideoCallScreen from './pages/VideoCall/VideoCallScreen'
import ChatbotJournalPage from './pages/ChatbotJournal/ChatbotJournalPage'
import ComingSoonPage from './pages/Common/ComingSoonPage'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('medilink_logged_in') === 'true'
  })

  const handleLoginSuccess = (_email: string) => {
    setIsLoggedIn(true)
    localStorage.setItem('medilink_logged_in', 'true')
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Login page ── */}
        <Route 
          path="/login" 
          element={
            isLoggedIn ? (
              <Navigate to={`/video-call/Ce9f8c`} />
            ) : (
              <Login onLoginSuccess={handleLoginSuccess} />
            )
          } 
        />

        {/* ── Dilshari: Video Call Module ── */}
        <Route 
          path="/video-call/:sessionId" 
          element={isLoggedIn ? <VideoCallScreen /> : <Navigate to="/login" />} 
        />

        <Route
          path="/video-call"
          element={isLoggedIn ? <Navigate to="/video-call/Ce9f8c" /> : <Navigate to="/login" />}
        />

        <Route
          path="/journals"
          element={isLoggedIn ? <ChatbotJournalPage defaultStep={6} /> : <Navigate to="/login" />}
        />

        <Route
          path="/dashboard"
          element={
            isLoggedIn ? (
              <ComingSoonPage
                title="Dashboard"
                subtitle="Overview widgets and metrics are being prepared for you."
                activePath="/dashboard"
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/schedule"
          element={
            isLoggedIn ? (
              <ComingSoonPage
                title="Schedule"
                subtitle="Appointment scheduling and calendar tools are coming soon."
                activePath="/schedule"
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/patients"
          element={
            isLoggedIn ? (
              <ComingSoonPage
                title="Patient Management"
                subtitle="Patient records and management tools are under development."
                activePath="/patients"
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/chatbot"
          element={
            isLoggedIn ? (
              <ChatbotJournalPage defaultStep={1} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* ── Default route ── */}
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App


