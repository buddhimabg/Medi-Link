# Medi-Link Final Evaluation Testing Checklist

This comprehensive testing checklist verifies the 8-point evaluation rubric across all 6 audited feature areas. Use this checklist during final QA and code-review preparation.

---

## 1. Mood Tracking Validation
- [ ] **Valid Check-In Submission**: Submit a check-in with mood level, sleep level (1-10), and note. Verify `POST /api/moods` returns `201 Created` and updates rolling averages in state.
- [ ] **Out-of-Bounds Numeric Validation**: Attempt to submit a check-in with a numeric mood level < 1 or > 10 (or non-numeric string). Assert backend returns `400 Bad Request` with a structured validation error message.
- [ ] **Empty Note & Optional Fields**: Verify check-in succeeds when optional note is empty, defaulting appropriately without throwing null pointer exceptions.
- [ ] **Streak & Score Engine Calculation**: Verify that consecutive daily check-ins correctly increment the streak count and calculate a valid mental health score between 1 and 100 in `scoreEngine.js`.

---

## 2. AI Journal/Speech Analysis Error Handling
- [ ] **Empty Journal Input**: Send `POST /api/ai/analyze-journal` with an empty string or whitespace-only payload. Assert backend returns `400 Bad Request` with `"Journal text is required and must be a non-empty string"`.
- [ ] **Missing Speech Input**: Send `POST /api/ai/analyze-speech` without audio files or transcript strings. Assert backend returns `400 Bad Request` with `"Speech analysis input is required"`.
- [ ] **Missing Combined Analysis Input**: Send `POST /api/ai/analyze-combined` with `{}` (no journal, speech, or camera data). Assert backend returns `400 Bad Request` with `"At least one input (journalText, speechText, or cameraData) is required for combined analysis"`.
- [ ] **API Timeout / Service Unavailability**: Simulate an LLM/Ollama service timeout or disconnect. Verify frontend catches the error and displays `"Server error. Please try again in a moment."` via `getErrorMessage` without exposing raw `AxiosError` or `[object Object]` to the user.

---

## 3. Prescription Duplicate Detection
- [ ] **Duplicate Drug Keyword Matching**: Upload or submit two prescription reminders with matching medication keywords (e.g., "Amoxicillin") within a 3-hour window. Verify the backend detects the collision and returns `isDuplicate: true` with an explanation in `duplicateMessage`.
- [ ] **Different Medication Allowance**: Submit two reminders at the exact same time with different medication names (e.g., "Amoxicillin" and "Ibuprofen"). Assert both reminders save cleanly without triggering false duplicate warnings.

---

## 4. Reminder Duration Validation
- [ ] **Valid Duration & End Date**: Create a daily reminder with `durationDays: 7`. Verify `endDate` is automatically computed and normalized to 7 days from the start date in `reminderController.js`.
- [ ] **Zero or Negative Duration**: Create a reminder with `durationDays: 0` or negative numbers. Verify the system treats it as an indefinite or single-occurrence schedule without crashing date calculation loops.
- [ ] **Midnight Timezone Transition**: Verify `getTodayReminders` correctly handles date boundary transitions across different timezones (`Asia/Colombo` vs UTC) and resets transient `isDisabledToday` flags on new calendar days.

---

## 5. Report Upload Validation
- [ ] **Missing userId Parameter**: Send `POST /api/lab-reports/upload` with a valid file but without `userId` in body or query. Assert backend returns `400 Bad Request` with `"userId is required."` (confirming `"testuser001"` fallback is removed).
- [ ] **Valid PDF & Image MIME Types**: Upload a valid medical lab report PDF and JPEG image. Verify backend extracts text, hydrates marker ranges (`normal`, `low`, `high`), and returns `201 Created`.

---

## 6. Invalid Report/Prescription Images
- [ ] **Unsupported File Format**: Attempt to upload a `.txt`, `.exe`, or `.docx` file to `uploadAndAnalyzeReport` or `uploadPrescription`. Assert backend rejects the request with a clean `400 Bad Request` error.
- [ ] **Unreadable / Corrupted Image OCR**: Upload a blurry or blank prescription image where no text can be extracted. Verify frontend displays `"No medication reminders could be extracted from this image. Please ensure the image is a valid prescription."` without throwing unhandled rejection errors.

---

## 7. Mood Fix Activity Completion
- [ ] **Activity Lifecycle Transition**: Start a mood fix activity and submit feedback with `moodAfter` rating (1-10). Verify `POST /api/mood-fix/feedback` updates `MoodFixActivityLog` status from `"started"` to `"completed"` and records timestamp.
- [ ] **Step Completion Guard**: Verify users are visually guided through checklist steps in `MoodFixActivityDetail.tsx` before marking an activity complete.
- [ ] **Camera Permission Denial Recovery**: Deny webcam permissions during facial mood detection. Verify frontend catches `NotAllowedError` and renders `"Camera permission denied. Please allow camera access in your browser settings."`

---

## 8. Shared UI Feedback Components
- [ ] **ConfirmDialog Accessibility & Keyboard Trapping**: Trigger a delete confirmation modal. Verify pressing `Escape` closes the dialog, backdrop clicks dismiss the modal, and no native `window.confirm()` browser alert is triggered.
- [ ] **InlineAlert Auto-Dismiss**: Render an `<InlineAlert type="success" autoCloseMs={4000} />`. Assert the alert automatically disappears after 4 seconds and cleanly clears timers on component unmount.
- [ ] **LoadingButton Duplicate Submission Prevention**: Click a `<LoadingButton isLoading={true} />` during an active API submission. Assert button sets `disabled={true}`, displays a spinner animation, and ignores repeated clicks.
