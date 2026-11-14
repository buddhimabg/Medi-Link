import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import JournalsPage from "./JournalsPage";
import AIWriterPage from "./AIWriterPage";
import ViewArticlePage from "./ViewArticlePage"; 
import EditArticlePage from "./EditArticlePage";
import UploadArticlePage from "./UploadArticlePage";
import DraftPreviewPage from "./DraftPreviewPage";
import UploadProgressPage from "./UploadProgressPage";
import PublishSuccessPage from "./PublishSuccessPage";

const JournalsRouter: React.FC = () => {
  return (
    <Routes>
      {/* Journals වල මුල් පිටුව */}
      <Route path="/" element={<JournalsPage />} />

      {/* Upload පිටුව */}
      <Route path="/upload" element={<UploadArticlePage />} />

      {/* AI Writer පිටුව */}
      <Route path="/ai-writer" element={<AIWriterPage />} />

      {/* ලිපියක් නැරඹීමේ පිටුව */}
      <Route path="/view/:id" element={<ViewArticlePage />} />

      {/* ලිපියක් සංස්කරණය කිරීමේ පිටුව */}
      <Route path="/edit/:id" element={<EditArticlePage />} />

      {/* Draft එකක් preview කිරීමේ පිටුව */}
      <Route path="/draft/:id" element={<DraftPreviewPage />} />

      {/* Upload/Publish progress පිටුව */}
      <Route path="/progress" element={<UploadProgressPage />} />

      {/* Publish සාර්ථක වූ පසු පෙන්වන පිටුව */}
      <Route path="/success" element={<PublishSuccessPage />} />

      {/* වෙනත් ඕනෑම URL එකක් ආවොත් මුල් පිටුවට යොමු කරයි */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default JournalsRouter;