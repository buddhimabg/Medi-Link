// src/pages/VideoCall/VideoCallScreen.tsx
import React, { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useVideoCall } from '../../hooks/useVideoCall'
import styles from './VideoCallScreen.module.css'

import PreCallSetup       from './PreCallSetup'
import WaitingRoom        from './WaitingRoom'
import PatientHistoryPage from './PatientHistoryPage'
import ConnectingScreen   from './ConnectingScreen'
import LiveCallScreen     from './LiveCallScreen'
import ScreenShare        from './ScreenShare'
import EndSessionDialog   from './EndSessionDialog'
import SummaryScreen      from './SummaryScreen'

interface Props {
  onLogout?: () => void
  userName?:  string
}

const VideoCallScreen: React.FC<Props> = ({ onLogout, userName }) => {
  const { sessionId = 'TEST_SESSION_001' } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const vc = useVideoCall(sessionId)
  const S  = vc.Step

  // FIX: LiveCallScreen eke internal modal confirm wenama call wena callback.
  // "End Session" button click wenakota step change WENAWA NA —
  // modal eke "End Session" confirm click wenakota matharama step change wenawa.
  const handleLiveCallEndConfirm = useCallback(() => {
    vc.setStep(S.END_SESSION)
  }, [vc, S.END_SESSION])

  const queueFirstPatient = vc.doctorQueue[0] ?? null

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
            onLogout={onLogout}
            userName={userName}
            doctorQueue={vc.doctorQueue}
            stepTargets={{
              deviceCheck:     S.PRE_CALL_SETUP,
              waitingRoom:     S.WAITING_ROOM,
              connecting:      S.CONNECTING,
              activeCall:      S.LIVE_CALL,
              screenShare:     S.SCREEN_SHARE,
              inCallChat:      S.LIVE_CALL,
              prescription:    S.PRESCRIPTION,
              endCall:         S.END_SESSION,
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
            onSendInvitation={vc.handleSendInvitation}
            patientJoined={vc.patientJoined}
            waitingStatus={vc.waitingStatus}
            patientName={vc.patientName}
            doctorQueue={vc.doctorQueue}
          />
        )

      case S.PATIENT_HISTORY:
        return (
          <PatientHistoryPage
            sessionId={sessionId}
            patientId={vc.patientId ?? queueFirstPatient?.patientId ?? null}
            patientName={vc.patientName || queueFirstPatient?.patientName}
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
            onBack={() => vc.goToWaitingRoom()}
          />
        )

      // LIVE_CALL and PRESCRIPTION — same LiveCallScreen component
      case S.LIVE_CALL:
      case S.PRESCRIPTION:
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
            // FIX: onEndConfirm — modal confirm wenakota matharama step change wenawa.
            // "End Session" button click wenakota LiveCallScreen eke internal modal
            // pennawa, navigate WENAWA NA. modal eke confirm karahama matharama
            // handleLiveCallEndConfirm call wela S.END_SESSION ekata yenawa.
            onEndConfirm={handleLiveCallEndConfirm}
            onBack={() => vc.goToWaitingRoom()}
            // Prescription overlay props
            showPrescription={vc.step === S.PRESCRIPTION}
            medications={vc.medications}
            removeMedication={vc.removeMedication}
            newMed={vc.newMed}
            setNewMed={vc.setNewMed}
            onAddMed={vc.addMedication}
            rxNotes={vc.rxNotes}
            setRxNotes={vc.setRxNotes}
            onIssue={vc.issuePrescription}
            rxSaved={vc.rxSaved}
            onClosePrescription={() => vc.setStep(S.LIVE_CALL)}
            patientName={vc.patientName || queueFirstPatient?.patientName || 'Patient'}
            doctorName={vc.doctorName || vc.callData?.userName || userName || 'Doctor'}
            sessionId={sessionId}
            onSaveNote={vc.saveSessionNotes}
            existingRx={vc.existingRx}
            patientHistory={vc.patientHistory}
            chatConnected={vc.chatConnected}
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

      case S.END_SESSION:
        return (
          <EndSessionDialog
            duration={vc.duration}
            formatDuration={vc.formatDuration}
            patientName={vc.patientName || queueFirstPatient?.patientName}
            prescriptionCount={vc.medications.length}
            unsavedNoteLines={
              vc.notesSaved || !vc.sessionNotes.trim()
                ? 0
                : vc.sessionNotes.trim().split('\n').filter(l => l.trim()).length
            }
            queueCount={vc.queueCount}
            nextPatient={vc.nextPatient}
            onConfirm={vc.handleEndCall}
            onReturn={() => vc.setStep(S.LIVE_CALL)}
          />
        )

      case S.SUMMARY:
        return (
          <SummaryScreen
            sessionId={sessionId}
            duration={vc.duration}
            formatDuration={vc.formatDuration}
            summaryLoading={vc.summaryLoading}
            summaryNotes={vc.summaryNotes}
            summaryRxList={vc.summaryRxList}
            patientName={vc.patientName || queueFirstPatient?.patientName}
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