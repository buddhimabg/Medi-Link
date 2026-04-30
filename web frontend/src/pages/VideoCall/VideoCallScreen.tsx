// src/pages/VideoCall/VideoCallScreen.tsx
import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useVideoCall } from '../../hooks/useVideoCall'
import styles from './VideoCallScreen.module.css'

import PreCallSetup       from './PreCallSetup'
import WaitingRoom        from './WaitingRoom'
import PatientHistoryPage from './PatientHistoryPage'
import ConnectingScreen   from './ConnectingScreen'
import LiveCallScreen     from './LiveCallScreen'
import ScreenShare        from './ScreenShare'
import PrescriptionMode   from './PrescriptionMode'
import EndSessionDialog   from './EndSessionDialog'
import SummaryScreen      from './SummaryScreen'

const VideoCallScreen: React.FC = () => {
  const { sessionId = 'Ce9f8c' } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const vc = useVideoCall(sessionId)
  const S  = vc.Step

  const renderScreen = () => {
    switch (vc.step) {

      case S.PRE_CALL_SETUP:
        return (
          <PreCallSetup
            sessionId={sessionId}
            camOk={vc.camOk}
            micOk={vc.micOk}
            checking={vc.checking}
            loading={vc.loading}
            apiError={vc.apiError}
            onRecheck={vc.runDeviceCheck}
            onStart={vc.handleStartSession}
            onNavigateStep={vc.setStep}
            stepTargets={{
              deviceCheck: S.PRE_CALL_SETUP,
              waitingRoom: S.WAITING_ROOM,
              connecting: S.CONNECTING,
              activeCall: S.LIVE_CALL,
              screenShare: S.SCREEN_SHARE,
              inCallChat: S.LIVE_CALL,
              prescription: S.PRESCRIPTION,
              endCall: S.END_SESSION,
              postCallSummary: S.SUMMARY,
            }}
          />
        )

      case S.WAITING_ROOM:
        return (
          <WaitingRoom
            sessionId={sessionId}
            onJoin={vc.handleJoinCall}
            onCancel={() => vc.setStep(S.PRE_CALL_SETUP)}
            onViewHistory={() => vc.setStep(S.PATIENT_HISTORY)}
          />
        )

      case S.PATIENT_HISTORY:
        return (
          <PatientHistoryPage
            sessionId={sessionId}
            onBack={() => vc.setStep(S.WAITING_ROOM)}
            onJoin={() => {
              vc.setStep(S.WAITING_ROOM)
              vc.handleJoinCall()
            }}
          />
        )

      case S.CONNECTING:
        return (
          <ConnectingScreen
            onBack={() => vc.setStep(S.WAITING_ROOM)}
          />
        )

      case S.LIVE_CALL:
        return (
          <LiveCallScreen
            callData={vc.callData}
            duration={vc.duration}
            formatDuration={vc.formatDuration}
            micMuted={vc.micMuted}
            setMicMuted={vc.setMicMuted}
            camOff={vc.camOff}
            setCamOff={vc.setCamOff}
            sessionNotes={vc.sessionNotes}
            setSessionNotes={vc.setSessionNotes}
            messages={vc.messages}
            chatInput={vc.chatInput}
            setChatInput={vc.setChatInput}
            patientTyping={vc.patientTyping}
            sendChatMessage={vc.sendChatMessage}
            onShare={() => vc.setStep(S.SCREEN_SHARE)}
            onPrescribe={() => vc.setStep(S.PRESCRIPTION)}
            onEndConfirm={() => vc.setStep(S.END_SESSION)}
            onBack={() => vc.setStep(S.WAITING_ROOM)}
          />
        )

      case S.SCREEN_SHARE:
        return (
          <ScreenShare
            duration={vc.duration}
            formatDuration={vc.formatDuration}
            onStopShare={() => vc.setStep(S.LIVE_CALL)}
            onEnd={() => vc.setStep(S.END_SESSION)}
          />
        )

      case S.PRESCRIPTION:
        return (
          <PrescriptionMode
            duration={vc.duration}
            formatDuration={vc.formatDuration}
            medications={vc.medications}
            removeMedication={vc.removeMedication}
            newMed={vc.newMed}
            setNewMed={vc.setNewMed}
            onAddMed={vc.addMedication}
            rxNotes={vc.rxNotes}
            setRxNotes={vc.setRxNotes}
            onIssue={vc.issuePrescription}
            rxSaved={vc.rxSaved}
            onEnd={() => vc.setStep(S.END_SESSION)}
            onBack={() => vc.setStep(S.LIVE_CALL)}
          />
        )

      case S.END_SESSION:
        return (
          <EndSessionDialog
            duration={vc.duration}
            formatDuration={vc.formatDuration}
            onConfirm={vc.handleEndCall}
            onReturn={() => vc.setStep(S.LIVE_CALL)}
          />
        )

      case S.SUMMARY:
        return (
          <SummaryScreen
            duration={vc.duration}
            formatDuration={vc.formatDuration}
            onDashboard={() => navigate('/dashboard')}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className={`medilink-app ${styles.shell}`}>
      <div className={styles.content}>
        {renderScreen()}
      </div>
    </div>
  )
}

export default VideoCallScreen