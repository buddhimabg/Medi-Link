import React, { useState, useEffect } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  FileText,
  Settings,
  LogOut,
  ShieldCheck,
  Mail,
  Send,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Monitor,
  Smartphone,
  RefreshCw,
  Search,
  X,
  History,
  Sparkles,
  ExternalLink,
  Check,
  CheckSquare,
  Square,
  Megaphone,
  DollarSign,
  CalendarCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, clearAuthToken } from '../api/api';
import './SendNotificationsPage.css';
import './AdminDashboardPage.css';

interface RecipientDoctor {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  role: string;
  status: string;
  isVerified: boolean;
  avatar?: string;
}

interface RecipientPatient {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  city: string;
  role: string;
  status: string;
}

interface TemplatePreset {
  id: string;
  name: string;
  category: string;
  priority: string;
  badge: string;
  icon: string;
  description: string;
  defaultSubject: string;
  defaultTitle: string;
  defaultBody: string;
  defaultHighlight: string;
  defaultButtonText: string;
  defaultButtonUrl: string;
}

interface EmailLogItem {
  _id: string;
  subject: string;
  templateName: string;
  category: string;
  priority: string;
  targetType: string;
  recipientCount: number;
  successCount: number;
  failedCount: number;
  title: string;
  messageBody: string;
  highlightBox: string;
  buttonText: string;
  buttonUrl: string;
  sentByName: string;
  status: 'sent' | 'partially_failed' | 'failed';
  recipients: Array<{ email: string; name: string; role: string; status: string; error?: string }>;
  createdAt: string;
}

const SendNotificationsPage: React.FC = () => {
  const navigate = useNavigate();

  // Navigation / Auth State
  const [userName] = useState('Mr.David');
  const [pendingApprovals, setPendingApprovals] = useState<number>(0);

  // Tabs: 'compose' | 'history' | 'templates'
  const [activeTab, setActiveTab] = useState<'compose' | 'history' | 'templates'>('compose');

  // Preview Device Mode
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // SMTP Server Status
  const [smtpStatus, setSmtpStatus] = useState<{ connected: boolean; smtpUser: string; service: string } | null>(null);
  const [isCheckingSmtp, setIsCheckingSmtp] = useState(false);

  // Recipients Data
  const [doctorsList, setDoctorsList] = useState<RecipientDoctor[]>([]);
  const [patientsList, setPatientsList] = useState<RecipientPatient[]>([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);

  // Form State
  const [targetType, setTargetType] = useState<'all_patients' | 'all_doctors' | 'selected_doctors' | 'selected_patients' | 'custom'>('all_patients');
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>([]);
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([]);
  const [customEmailsInput, setCustomEmailsInput] = useState<string>('');
  const [recipientSearchQuery, setRecipientSearchQuery] = useState<string>('');

  // Templates
  const [templates, setTemplates] = useState<TemplatePreset[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('general_announcement');

  // Content Fields
  const [subject, setSubject] = useState<string>('Important Update from MediLink Healthcare');
  const [title, setTitle] = useState<string>('Notice: Platform Improvements & Schedule Updates');
  const [category, setCategory] = useState<string>('announcement');
  const [priority, setPriority] = useState<string>('normal');
  const [messageBody, setMessageBody] = useState<string>(
    'We are committed to providing you with the highest standard of healthcare services. We are writing to notify you about recent updates and enhancements implemented across the MediLink network.\n\nOur digital consulting and appointment scheduling services are fully operational. If you need any assistance, our clinical support team is available 24/7.'
  );
  const [highlightBox, setHighlightBox] = useState<string>(
    '📅 Effective Date: Immediate\n🏥 Affected Departments: All Clinical & Outpatient Services\n📞 Support Hotline: +94 11 234 5678'
  );
  const [buttonText, setButtonText] = useState<string>('Access MediLink Portal');
  const [buttonUrl, setButtonUrl] = useState<string>('http://localhost:5173');

  // History Logs
  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [selectedLogDetail, setSelectedLogDetail] = useState<EmailLogItem | null>(null);

  // Modals & Feedback
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmailInput, setTestEmailInput] = useState('pavindugrx11@gmail.com');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showConfirmSendModal, setShowConfirmSendModal] = useState(false);

  // Trigger Toast Notification
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Fetch initial data
  useEffect(() => {
    checkSmtpStatus();
    fetchRecipients();
    fetchTemplates();
    fetchLogs();

    // Check doctor approvals badge
    apiFetch<any>('/doctors/approval-stats')
      .then((res) => {
        if (res?.data?.pending) setPendingApprovals(res.data.pending);
      })
      .catch(() => {});
  }, []);

  // Check SMTP
  const checkSmtpStatus = async () => {
    setIsCheckingSmtp(true);
    try {
      const res = await apiFetch<any>('/notifications/smtp-status');
      if (res?.data) {
        setSmtpStatus(res.data);
      }
    } catch {
      setSmtpStatus({ connected: false, smtpUser: 'pavindugrx11@gmail.com', service: 'Gmail' });
    } finally {
      setIsCheckingSmtp(false);
    }
  };

  // Fetch Recipients
  const fetchRecipients = async () => {
    setIsLoadingRecipients(true);
    try {
      const res = await apiFetch<any>('/notifications/recipients');
      if (res?.success && res?.data) {
        setDoctorsList(res.data.doctors || []);
        setPatientsList(res.data.patients || []);
      }
    } catch (err) {
      console.error('Failed to load recipients', err);
    } finally {
      setIsLoadingRecipients(false);
    }
  };

  // Fetch Templates
  const fetchTemplates = async () => {
    try {
      const res = await apiFetch<any>('/notifications/templates');
      if (res?.success && res?.data) {
        setTemplates(res.data);
      }
    } catch (err) {
      console.error('Failed to load templates', err);
    }
  };

  // Fetch History Logs
  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await apiFetch<any>('/notifications/logs');
      if (res?.success && res?.data?.logs) {
        setLogs(res.data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Handle Template Change
  const handleSelectTemplate = (tpl: TemplatePreset) => {
    setSelectedTemplateId(tpl.id);
    setCategory(tpl.category);
    setPriority(tpl.priority);
    setSubject(tpl.defaultSubject);
    setTitle(tpl.defaultTitle);
    setMessageBody(tpl.defaultBody);
    setHighlightBox(tpl.defaultHighlight);
    setButtonText(tpl.defaultButtonText);
    setButtonUrl(tpl.defaultButtonUrl);
    showToast(`Loaded template: "${tpl.name}"`, 'info');
  };

  // Calculate selected recipients count
  const calculateRecipientCount = () => {
    switch (targetType) {
      case 'all_patients':
        return patientsList.length;
      case 'all_doctors':
        return doctorsList.length;
      case 'selected_doctors':
        return selectedDoctorIds.length;
      case 'selected_patients':
        return selectedPatientIds.length;
      case 'custom':
        return customEmailsInput
          .split(/[,;\n]/)
          .map((e) => e.trim())
          .filter((e) => e.includes('@')).length;
      default:
        return 0;
    }
  };

  // Handle Toggle Doctor selection
  const handleToggleDoctor = (id: string) => {
    setSelectedDoctorIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // Handle Toggle Patient selection
  const handleTogglePatient = (id: string) => {
    setSelectedPatientIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // Select all / Deselect all
  const handleSelectAllDoctors = () => {
    if (selectedDoctorIds.length === doctorsList.length) {
      setSelectedDoctorIds([]);
    } else {
      setSelectedDoctorIds(doctorsList.map((d) => d.id));
    }
  };

  const handleSelectAllPatients = () => {
    if (selectedPatientIds.length === patientsList.length) {
      setSelectedPatientIds([]);
    } else {
      setSelectedPatientIds(patientsList.map((p) => p.id));
    }
  };

  // Send Test Email
  const handleSendTestEmail = async () => {
    if (!testEmailInput || !testEmailInput.includes('@')) {
      showToast('Please enter a valid test email address.', 'error');
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await apiFetch<any>('/notifications/test', {
        method: 'POST',
        body: JSON.stringify({
          testEmail: testEmailInput,
          subject,
          title,
          category,
          priority,
          messageBody,
          highlightBox,
          buttonText,
          buttonUrl
        })
      });

      if (res?.success) {
        showToast(`Test email successfully delivered to ${testEmailInput}!`, 'success');
        setShowTestModal(false);
      } else {
        showToast(res?.message || 'Failed to send test email.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error transmitting test email.', 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  // Send Main Broadcast
  const handleSendBroadcast = async () => {
    const totalSelected = calculateRecipientCount();
    if (totalSelected === 0) {
      showToast('Please select or specify at least one recipient.', 'error');
      return;
    }

    if (!subject.trim()) {
      showToast('Please provide an email subject line.', 'error');
      return;
    }

    if (!messageBody.trim()) {
      showToast('Please enter message body content.', 'error');
      return;
    }

    setIsSending(true);
    setShowConfirmSendModal(false);

    try {
      const currentTemplate = templates.find((t) => t.id === selectedTemplateId);
      const selectedIds = targetType === 'selected_doctors' ? selectedDoctorIds : targetType === 'selected_patients' ? selectedPatientIds : [];

      const res = await apiFetch<any>('/notifications/send', {
        method: 'POST',
        body: JSON.stringify({
          targetType,
          selectedRecipientIds: selectedIds,
          customEmails: customEmailsInput,
          templateId: selectedTemplateId,
          templateName: currentTemplate?.name || 'Custom Notification',
          category,
          priority,
          subject,
          title: title || subject,
          messageBody,
          highlightBox,
          buttonText,
          buttonUrl
        })
      });

      if (res?.success) {
        showToast(`🎉 Broadcast completed: ${res.data?.successCount} sent, ${res.data?.failedCount} failed!`, 'success');
        fetchLogs();
      } else {
        showToast(res?.message || 'Broadcast transmission failed.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch notification broadcast.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    navigate('/login');
  };

  // Badge config for live preview
  const getBadgeDetails = () => {
    if (priority === 'urgent' || category === 'urgent_alert') {
      return { bg: '#FEE2E2', color: '#991B1B', border: '#F87171', label: 'URGENT HEALTH ADVISORY' };
    }
    switch (category) {
      case 'doctor_verification':
        return { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D', label: 'DOCTOR LICENSING & VERIFICATION' };
      case 'appointment':
        return { bg: '#E0F2FE', color: '#075985', border: '#7DD3FC', label: 'APPOINTMENT & SCHEDULE UPDATE' };
      case 'medical_report':
        return { bg: '#DCFCE7', color: '#166534', border: '#86EFAC', label: 'MEDICAL REPORT & LAB RESULTS' };
      case 'billing':
        return { bg: '#F3E8FF', color: '#6B21A8', border: '#D8B4FE', label: 'BILLING & ACCOUNT STATEMENT' };
      case 'announcement':
      default:
        return { bg: '#EFF6FF', color: '#1E40AF', border: '#93C5FD', label: 'OFFICIAL MEDILINK NOTICE' };
    }
  };

  const previewBadge = getBadgeDetails();

  // Filter lists by search
  const filteredDoctors = doctorsList.filter(
    (d) =>
      d.name.toLowerCase().includes(recipientSearchQuery.toLowerCase()) ||
      d.email.toLowerCase().includes(recipientSearchQuery.toLowerCase()) ||
      d.specialty.toLowerCase().includes(recipientSearchQuery.toLowerCase())
  );

  const filteredPatients = patientsList.filter(
    (p) =>
      p.name.toLowerCase().includes(recipientSearchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(recipientSearchQuery.toLowerCase()) ||
      p.phone.toLowerCase().includes(recipientSearchQuery.toLowerCase())
  );

  const filteredLogs = logs.filter(
    (l) =>
      l.subject.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      l.templateName?.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      l.sentByName?.toLowerCase().includes(logSearchQuery.toLowerCase())
  );

  return (
    <div className="notifications-page-container">
      {/* ===== SIDEBAR ===== */}
      <AdminSidebar activeRoute="/send-notifications" />

      {/* ===== MAIN CONTENT ===== */}
      <main className="notif-main-content">
        {/* Header */}
        <div className="notif-header">
          <div className="notif-header-left">
            <h1>Email Notification & Broadcast Hub</h1>
            <p>Compose and transmit branded, secure email communications to doctors, patients, or custom contact lists.</p>
          </div>
          <div className="notif-header-right">
            <div className="smtp-status-badge">
              <span className={`smtp-indicator ${smtpStatus?.connected ? 'connected' : 'disconnected'}`} />
              <span>
                SMTP: {smtpStatus?.connected ? `Active (${smtpStatus?.smtpUser})` : 'Offline'}
              </span>
              <button
                onClick={checkSmtpStatus}
                title="Refresh SMTP status"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}
              >
                <RefreshCw size={14} className={isCheckingSmtp ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="notif-stats-grid">
          <div className="notif-stat-card">
            <div className="notif-stat-info">
              <h4>Total Doctors</h4>
              <div className="stat-number">{doctorsList.length}</div>
            </div>
            <div className="notif-stat-icon-wrapper" style={{ background: '#ede9fe', color: '#8b5cf6' }}>
              <Stethoscope size={22} />
            </div>
          </div>

          <div className="notif-stat-card">
            <div className="notif-stat-info">
              <h4>Total Patients</h4>
              <div className="stat-number">{patientsList.length}</div>
            </div>
            <div className="notif-stat-icon-wrapper" style={{ background: '#e0e7ff', color: '#6366f1' }}>
              <Users size={22} />
            </div>
          </div>

          <div className="notif-stat-card">
            <div className="notif-stat-info">
              <h4>Broadcasts Sent</h4>
              <div className="stat-number">{logs.length}</div>
            </div>
            <div className="notif-stat-icon-wrapper" style={{ background: '#dcfce7', color: '#16a34a' }}>
              <Send size={22} />
            </div>
          </div>

          <div className="notif-stat-card">
            <div className="notif-stat-info">
              <h4>Active Templates</h4>
              <div className="stat-number">{templates.length || 6}</div>
            </div>
            <div className="notif-stat-icon-wrapper" style={{ background: '#eff6ff', color: '#0C5BD5' }}>
              <Sparkles size={22} />
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="notif-tabs-bar">
          <button
            className={`notif-tab-btn ${activeTab === 'compose' ? 'active' : ''}`}
            onClick={() => setActiveTab('compose')}
          >
            <Mail size={16} />
            Compose & Broadcast
          </button>
          <button
            className={`notif-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={16} />
            Dispatch Logs ({logs.length})
          </button>
          <button
            className={`notif-tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            <FileText size={16} />
            Template Catalog
          </button>
        </div>

        {/* ========================================================
            TAB 1: COMPOSE & BROADCAST
        ======================================================== */}
        {activeTab === 'compose' && (
          <div className="notif-compose-grid">
            {/* LEFT: Composer Form */}
            <div className="compose-card">
              {/* Step 1: Audience */}
              <div className="compose-section-title">
                <span className="compose-step-num">1</span>
                <span>Select Target Audience</span>
              </div>

              <div className="target-audience-pills">
                <button
                  type="button"
                  className={`audience-pill ${targetType === 'all_patients' ? 'selected' : ''}`}
                  onClick={() => setTargetType('all_patients')}
                >
                  <Users size={15} /> All Patients ({patientsList.length})
                </button>

                <button
                  type="button"
                  className={`audience-pill ${targetType === 'all_doctors' ? 'selected' : ''}`}
                  onClick={() => setTargetType('all_doctors')}
                >
                  <Stethoscope size={15} /> All Doctors ({doctorsList.length})
                </button>

                <button
                  type="button"
                  className={`audience-pill ${targetType === 'selected_doctors' ? 'selected' : ''}`}
                  onClick={() => setTargetType('selected_doctors')}
                >
                  <CheckSquare size={15} /> Specific Doctors ({selectedDoctorIds.length})
                </button>

                <button
                  type="button"
                  className={`audience-pill ${targetType === 'selected_patients' ? 'selected' : ''}`}
                  onClick={() => setTargetType('selected_patients')}
                >
                  <CheckSquare size={15} /> Specific Patients ({selectedPatientIds.length})
                </button>

                <button
                  type="button"
                  className={`audience-pill ${targetType === 'custom' ? 'selected' : ''}`}
                  onClick={() => setTargetType('custom')}
                >
                  <Mail size={15} /> Custom Email
                </button>
              </div>

              {/* Specific Doctors Picker */}
              {targetType === 'selected_doctors' && (
                <div className="recipients-picker-box">
                  <div className="picker-search-bar">
                    <div className="picker-input-wrap">
                      <Search size={14} />
                      <input
                        type="text"
                        placeholder="Search doctor by name, specialty, or email..."
                        value={recipientSearchQuery}
                        onChange={(e) => setRecipientSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="picker-actions">
                      <button type="button" className="btn-picker-action" onClick={handleSelectAllDoctors}>
                        {selectedDoctorIds.length === doctorsList.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                  </div>

                  <div className="recipients-list-scroll">
                    {filteredDoctors.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '13px' }}>
                        No doctors matching search.
                      </div>
                    ) : (
                      filteredDoctors.map((doc) => {
                        const isChecked = selectedDoctorIds.includes(doc.id);
                        return (
                          <div
                            key={doc.id}
                            className={`recipient-item-row ${isChecked ? 'checked' : ''}`}
                            onClick={() => handleToggleDoctor(doc.id)}
                          >
                            <div className="recipient-left-info">
                              {isChecked ? <CheckSquare size={16} color="#0C5BD5" /> : <Square size={16} color="#94a3b8" />}
                              <div className="recipient-avatar-circle">
                                {doc.name.charAt(0)}
                              </div>
                              <div className="recipient-names">
                                <span className="recipient-name-text">{doc.name}</span>
                                <span className="recipient-email-text">{doc.email}</span>
                              </div>
                            </div>
                            <span className="recipient-badge-tag">{doc.specialty}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Specific Patients Picker */}
              {targetType === 'selected_patients' && (
                <div className="recipients-picker-box">
                  <div className="picker-search-bar">
                    <div className="picker-input-wrap">
                      <Search size={14} />
                      <input
                        type="text"
                        placeholder="Search patient by name, mobile, or email..."
                        value={recipientSearchQuery}
                        onChange={(e) => setRecipientSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="picker-actions">
                      <button type="button" className="btn-picker-action" onClick={handleSelectAllPatients}>
                        {selectedPatientIds.length === patientsList.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                  </div>

                  <div className="recipients-list-scroll">
                    {filteredPatients.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '13px' }}>
                        No patients matching search.
                      </div>
                    ) : (
                      filteredPatients.map((pat) => {
                        const isChecked = selectedPatientIds.includes(pat.id);
                        return (
                          <div
                            key={pat.id}
                            className={`recipient-item-row ${isChecked ? 'checked' : ''}`}
                            onClick={() => handleTogglePatient(pat.id)}
                          >
                            <div className="recipient-left-info">
                              {isChecked ? <CheckSquare size={16} color="#0C5BD5" /> : <Square size={16} color="#94a3b8" />}
                              <div className="recipient-avatar-circle">
                                {pat.name.charAt(0)}
                              </div>
                              <div className="recipient-names">
                                <span className="recipient-name-text">{pat.name}</span>
                                <span className="recipient-email-text">{pat.email}</span>
                              </div>
                            </div>
                            <span className="recipient-badge-tag">{pat.city || 'Patient'}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Custom Email Input */}
              {targetType === 'custom' && (
                <div className="form-group-item" style={{ marginBottom: '20px' }}>
                  <label>Custom Email Addresses (comma or newline separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. doctor@hospital.com, patient@gmail.com"
                    value={customEmailsInput}
                    onChange={(e) => setCustomEmailsInput(e.target.value)}
                  />
                </div>
              )}

              {/* Summary Bar */}
              <div className="selected-summary-bar">
                <span>🎯 Target Audience: <strong>{targetType.replace('_', ' ').toUpperCase()}</strong></span>
                <span><strong>{calculateRecipientCount()}</strong> Recipient(s)</span>
              </div>

              {/* Step 2: Choose Template */}
              <div className="compose-section-title">
                <span className="compose-step-num">2</span>
                <span>Choose Professional Template</span>
              </div>

              <div className="template-cards-grid">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className={`template-choice-card ${selectedTemplateId === tpl.id ? 'active' : ''}`}
                    onClick={() => handleSelectTemplate(tpl)}
                  >
                    <div className="template-card-top">
                      {tpl.category === 'urgent_alert' ? (
                        <AlertTriangle size={15} color="#dc2626" />
                      ) : tpl.category === 'appointment' ? (
                        <Calendar size={15} color="#0284c7" />
                      ) : tpl.category === 'medical_report' ? (
                        <FileText size={15} color="#16a34a" />
                      ) : tpl.category === 'doctor_verification' ? (
                        <ShieldCheck size={15} color="#d97706" />
                      ) : (
                        <Megaphone size={15} color="#0C5BD5" />
                      )}
                      <span>{tpl.name}</span>
                    </div>
                    <div className="template-card-desc">{tpl.description}</div>
                  </div>
                ))}
              </div>

              {/* Step 3: Customize Message */}
              <div className="compose-section-title">
                <span className="compose-step-num">3</span>
                <span>Message & Design Content</span>
              </div>

              <div className="form-row-two-col">
                <div className="form-group-item">
                  <label>Category Badge</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="announcement">Official MediLink Notice</option>
                    <option value="appointment">Appointment & Schedule Update</option>
                    <option value="medical_report">Medical Report & Lab Results</option>
                    <option value="doctor_verification">Doctor SLMC Verification Notice</option>
                    <option value="urgent_alert">Urgent Health Advisory</option>
                    <option value="billing">Billing & Statements</option>
                    <option value="custom">Custom Notice</option>
                  </select>
                </div>

                <div className="form-group-item">
                  <label>Priority Level</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option value="normal">Normal (Standard Blue)</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent / Emergency (Red Badge)</option>
                  </select>
                </div>
              </div>

              <div className="form-group-item">
                <label>Email Subject Line *</label>
                <input
                  type="text"
                  placeholder="e.g. Important Notice Regarding Your MediLink Account"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="form-group-item">
                <label>Header Title (Displayed inside email)</label>
                <input
                  type="text"
                  placeholder="e.g. Notice: Platform Improvements & Schedule Updates"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-group-item">
                <label>Message Body Content *</label>
                <textarea
                  rows={6}
                  placeholder="Write the notification message here. Use paragraphs for spacing..."
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                />
              </div>

              <div className="form-group-item">
                <label>Key Details / Highlight Callout Box (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. 📅 Date: Tomorrow&#10;📍 Location: Medical Center&#10;📞 Hotline: 1990"
                  value={highlightBox}
                  onChange={(e) => setHighlightBox(e.target.value)}
                />
              </div>

              <div className="form-row-two-col">
                <div className="form-group-item">
                  <label>Action Button Label</label>
                  <input
                    type="text"
                    placeholder="e.g. View My Appointments"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                  />
                </div>

                <div className="form-group-item">
                  <label>Action Button URL</label>
                  <input
                    type="text"
                    placeholder="e.g. http://localhost:5173/history"
                    value={buttonUrl}
                    onChange={(e) => setButtonUrl(e.target.value)}
                  />
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="compose-actions-footer">
                <button
                  type="button"
                  className="btn-send-test"
                  onClick={() => setShowTestModal(true)}
                  disabled={isSending || isSendingTest}
                >
                  <Mail size={16} />
                  Send Test Preview
                </button>

                <button
                  type="button"
                  className="btn-send-broadcast"
                  onClick={() => setShowConfirmSendModal(true)}
                  disabled={isSending || calculateRecipientCount() === 0}
                >
                  {isSending ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Broadcasting...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Send to {calculateRecipientCount()} Recipient(s)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* RIGHT: Live Interactive Email Preview */}
            <div className="preview-container-card">
              <div className="preview-header-bar">
                <div className="preview-title-wrap">
                  <Monitor size={18} color="#0C5BD5" />
                  <span>Real-Time Inbox Preview</span>
                </div>

                <div className="device-switcher-pills">
                  <button
                    className={`device-btn ${previewDevice === 'desktop' ? 'active' : ''}`}
                    onClick={() => setPreviewDevice('desktop')}
                  >
                    <Monitor size={14} /> Desktop
                  </button>
                  <button
                    className={`device-btn ${previewDevice === 'mobile' ? 'active' : ''}`}
                    onClick={() => setPreviewDevice('mobile')}
                  >
                    <Smartphone size={14} /> Mobile
                  </button>
                </div>
              </div>

              {/* Email Mockup Container */}
              <div className={`email-mockup-wrapper ${previewDevice === 'mobile' ? 'mobile-view' : ''}`}>
                <div className="email-card-body">
                  {/* Brand Header */}
                  <div className="mockup-header-banner">
                    <div className="mockup-brand">
                      <div className="mockup-logo-box">✚</div>
                      <div className="mockup-brand-text">
                        <h3>MediLink</h3>
                        <span>Healthcare Platform</span>
                      </div>
                    </div>
                    <div className="mockup-date-tag">
                      {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="mockup-content-body">
                    {/* Badge */}
                    <div
                      className="mockup-badge"
                      style={{
                        backgroundColor: previewBadge.bg,
                        color: previewBadge.color,
                        border: `1px solid ${previewBadge.border}`
                      }}
                    >
                      {previewBadge.label}
                    </div>

                    {/* Heading */}
                    <h2 className="mockup-heading">{title || subject || 'Notification Heading'}</h2>

                    {/* Salutation */}
                    <div className="mockup-salutation">
                      Dear {targetType === 'all_doctors' || targetType === 'selected_doctors' ? 'Dr. John Doe' : 'Valued Patient'},
                    </div>

                    {/* Body */}
                    <div className="mockup-paragraphs">
                      {messageBody || 'Please enter message body content on the left...'}
                    </div>

                    {/* Highlight Box */}
                    {highlightBox && (
                      <div className="mockup-highlight-box">
                        <div className="mockup-highlight-title">Important Details</div>
                        <div className="mockup-highlight-text">{highlightBox}</div>
                      </div>
                    )}

                    {/* Button CTA */}
                    {buttonText && buttonUrl && (
                      <div className="mockup-cta-btn-wrap">
                        <span className="mockup-cta-btn">
                          {buttonText} &rarr;
                        </span>
                      </div>
                    )}

                    {/* Sign-off */}
                    <div className="mockup-signoff">
                      Warm regards,<br />
                      <strong>MediLink Administration</strong><br />
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>MediLink Medical Operations</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mockup-footer">
                    <p>
                      This is an official system transmission from MediLink Healthcare Platform.<br />
                      Please do not reply directly to this automated email.
                    </p>
                    <p>
                      &copy; {new Date().getFullYear()} MediLink Healthcare System &bull; Colombo, Sri Lanka
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: DISPATCH HISTORY & LOGS
        ======================================================== */}
        {activeTab === 'history' && (
          <div className="history-card">
            <div className="history-search-row">
              <div className="picker-input-wrap" style={{ maxWidth: '360px' }}>
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Filter logs by subject or sender..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                />
              </div>

              <button className="btn-picker-action" onClick={fetchLogs} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={14} className={isLoadingLogs ? 'animate-spin' : ''} />
                Refresh Logs
              </button>
            </div>

            {isLoadingLogs ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
                Loading dispatch records...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
                <Mail size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                <h3 style={{ fontSize: '16px', color: '#334155', margin: '0 0 6px 0' }}>No Broadcast Records Found</h3>
                <p style={{ fontSize: '13px', margin: 0 }}>Compose a notification in the first tab to start broadcasting emails.</p>
              </div>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Subject</th>
                    <th>Audience</th>
                    <th>Delivered / Failed</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log._id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td>
                        <strong>{log.subject}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{log.templateName}</div>
                      </td>
                      <td>
                        <span className="recipient-badge-tag">{log.targetType?.replace('_', ' ').toUpperCase()}</span>
                      </td>
                      <td>
                        <span style={{ color: '#16a34a', fontWeight: 700 }}>{log.successCount || 0} sent</span>
                        {log.failedCount > 0 && (
                          <span style={{ color: '#dc2626', marginLeft: '6px' }}>({log.failedCount} failed)</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-pill-badge ${log.status || 'sent'}`}>
                          {log.status === 'sent' && <Check size={12} />}
                          {log.status === 'failed' && <AlertCircle size={12} />}
                          {log.status || 'Sent'}
                        </span>
                      </td>
                      <td>
                        <button className="btn-view-log" onClick={() => setSelectedLogDetail(log)}>
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 3: TEMPLATE CATALOG
        ======================================================== */}
        {activeTab === 'templates' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {templates.map((tpl) => (
              <div key={tpl.id} className="compose-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span className="recipient-badge-tag" style={{ background: '#eff6ff', color: '#0C5BD5' }}>
                      {tpl.category.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Priority: {tpl.priority}</span>
                  </div>

                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
                    {tpl.name}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                    {tpl.description}
                  </p>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Default Subject
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                      {tpl.defaultSubject}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-send-broadcast"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    handleSelectTemplate(tpl);
                    setActiveTab('compose');
                  }}
                >
                  <Sparkles size={16} />
                  Use This Template
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ========================================================
          TEST EMAIL MODAL
      ======================================================== */}
      {showTestModal && (
        <div className="modal-overlay-backdrop" onClick={() => setShowTestModal(false)}>
          <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Send Instant Test Email</h3>
              <button className="btn-close-modal" onClick={() => setShowTestModal(false)}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 16px 0' }}>
              Transmit a sample preview directly to your inbox to test rendering, styles, and links before sending to real patients or doctors.
            </p>

            <div className="form-group-item">
              <label>Recipient Email for Test *</label>
              <input
                type="email"
                placeholder="pavindugrx11@gmail.com"
                value={testEmailInput}
                onChange={(e) => setTestEmailInput(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button className="btn-picker-action" onClick={() => setShowTestModal(false)}>
                Cancel
              </button>
              <button
                className="btn-send-broadcast"
                onClick={handleSendTestEmail}
                disabled={isSendingTest}
              >
                {isSendingTest ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Sending Test...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Test Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          CONFIRM BROADCAST MODAL
      ======================================================== */}
      {showConfirmSendModal && (
        <div className="modal-overlay-backdrop" onClick={() => setShowConfirmSendModal(false)}>
          <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Confirm Email Broadcast</h3>
              <button className="btn-close-modal" onClick={() => setShowConfirmSendModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '14px', color: '#1e40af', margin: '0 0 6px 0', fontWeight: 700 }}>
                Broadcast Summary
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
                <li><strong>Target Audience:</strong> {targetType.replace('_', ' ').toUpperCase()}</li>
                <li><strong>Total Recipients:</strong> {calculateRecipientCount()}</li>
                <li><strong>Subject:</strong> {subject}</li>
                <li><strong>SMTP Sender:</strong> {smtpStatus?.smtpUser || 'pavindugrx11@gmail.com'}</li>
              </ul>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>
              Are you sure you want to dispatch this email broadcast? Each recipient will receive a personalized, branded copy.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-picker-action" onClick={() => setShowConfirmSendModal(false)}>
                Cancel
              </button>
              <button className="btn-send-broadcast" onClick={handleSendBroadcast}>
                <Send size={16} />
                Confirm & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          LOG DETAILS MODAL
      ======================================================== */}
      {selectedLogDetail && (
        <div className="modal-overlay-backdrop" onClick={() => setSelectedLogDetail(null)}>
          <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Broadcast Delivery Details</h3>
              <button className="btn-close-modal" onClick={() => setSelectedLogDetail(null)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', color: '#0f172a' }}>
                {selectedLogDetail.subject}
              </h4>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                Dispatched on {new Date(selectedLogDetail.createdAt).toLocaleString()} by {selectedLogDetail.sentByName}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>AUDIENCE</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0C5BD5' }}>
                  {selectedLogDetail.targetType?.replace('_', ' ').toUpperCase()}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>DELIVERY METRICS</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a' }}>
                  {selectedLogDetail.successCount} Sent / {selectedLogDetail.failedCount} Failed
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Message Body</div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#334155', whiteSpace: 'pre-line' }}>
                {selectedLogDetail.messageBody}
              </div>
            </div>

            {selectedLogDetail.highlightBox && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0C5BD5', marginBottom: '6px' }}>Key Details</div>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px', fontSize: '12px', color: '#1e40af', whiteSpace: 'pre-line' }}>
                  {selectedLogDetail.highlightBox}
                </div>
              </div>
            )}

            <div style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                Recipients List ({selectedLogDetail.recipients?.length || 0})
              </div>
              <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {selectedLogDetail.recipients?.map((r, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', fontSize: '12px' }}>
                    <span><strong>{r.name}</strong> ({r.email})</span>
                    <span style={{ color: r.status === 'sent' ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                      {r.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn-picker-action" onClick={() => setSelectedLogDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Alert */}
      {toast && (
        <div className={`toast-floating-banner ${toast.type}`}>
          {toast.type === 'success' && <CheckCircle size={18} />}
          {toast.type === 'error' && <AlertCircle size={18} />}
          {toast.type === 'info' && <Sparkles size={18} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default SendNotificationsPage;
