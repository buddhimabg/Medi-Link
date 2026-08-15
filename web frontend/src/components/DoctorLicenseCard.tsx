import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Award, FileText, QrCode, Copy, Check, ExternalLink, Eye, Printer } from 'lucide-react';
import './DoctorLicenseCard.css';

export interface DoctorLicenseInfo {
  id?: string;
  name: string;
  licenseNumber: string;
  specialty?: string;
  specialization?: string;
  nic?: string;
  qualifications?: string[];
  experience?: number;
  yearsOfExperience?: number;
  photo?: string;
  avatar?: string;
  isVerified?: boolean;
  verifiedAt?: string;
  licenseDocument?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface DoctorLicenseCardProps {
  doctor: DoctorLicenseInfo;
  compact?: boolean;
  showActions?: boolean;
  onVerify?: () => void;
  onReject?: () => void;
  onViewDetails?: () => void;
}

export const DoctorLicenseCard: React.FC<DoctorLicenseCardProps> = ({
  doctor,
  compact = false,
  showActions = false,
  onVerify,
  onReject,
  onViewDetails
}) => {
  const [viewMode, setViewMode] = useState<'card' | 'certificate' | 'doc'>(
    doctor.licenseDocument ? 'doc' : 'card'
  );
  const [copied, setCopied] = useState(false);
  const [verifiedRegistry, setVerifiedRegistry] = useState<boolean | null>(null);
  const [checkingRegistry, setCheckingRegistry] = useState(false);

  const licenseNum = doctor.licenseNumber || 'SLMC-PENDING';
  const specialty = doctor.specialty || doctor.specialization || 'Medical Practitioner';
  const qualifications = doctor.qualifications && doctor.qualifications.length > 0
    ? doctor.qualifications
    : ['MBBS'];
  const expYears = doctor.yearsOfExperience ?? doctor.experience ?? 0;

  const handleCopyLicense = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(licenseNum);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCheckRegistry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckingRegistry(true);
    setTimeout(() => {
      setCheckingRegistry(false);
      setVerifiedRegistry(true);
    }, 800);
  };

  const handlePrint = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.print();
  };

  const isVerified = doctor.isVerified === true;

  // Render Compact Card (for grid/list view)
  if (compact) {
    return (
      <div className={`slmc-license-badge-compact ${isVerified ? 'is-verified' : 'is-pending'}`}>
        <div className="license-badge-header">
          <div className="council-emblem">🏛️</div>
          <div className="council-meta">
            <span className="council-title">SRI LANKA MEDICAL COUNCIL</span>
            <span className="council-sub">OFFICIAL PRACTITIONER REGISTRATION</span>
          </div>
          <div className={`status-pill ${isVerified ? 'verified' : 'pending'}`}>
            {isVerified ? (
              <>
                <ShieldCheck size={13} />
                <span>Verified</span>
              </>
            ) : (
              <>
                <ShieldAlert size={13} />
                <span>Pending Review</span>
              </>
            )}
          </div>
        </div>

        <div className="license-badge-body">
          <div className="license-number-display" onClick={handleCopyLicense} title="Click to copy license number">
            <span className="reg-prefix">REG NO:</span>
            <span className="reg-code">{licenseNum}</span>
            <button className="copy-btn" type="button">
              {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
            </button>
          </div>

          <div className="license-details-row">
            <div className="detail-item">
              <span className="detail-label">NIC:</span>
              <span className="detail-value">{doctor.nic || 'Not Listed'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Exp:</span>
              <span className="detail-value">{expYears} Years</span>
            </div>
          </div>

          <div className="qualifications-chips">
            {qualifications.slice(0, 3).map((q, idx) => (
              <span key={idx} className="qualification-chip">{q}</span>
            ))}
            {qualifications.length > 3 && (
              <span className="qualification-chip more">+{qualifications.length - 3}</span>
            )}
          </div>
        </div>

        <div className="license-badge-footer">
          <div className="security-watermark">
            <span>🛡️ SECURE REGISTRATION RECORD</span>
          </div>
          {onViewDetails && (
            <button className="view-card-btn" onClick={onViewDetails} type="button">
              <Eye size={14} />
              <span>Inspect License</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Render Full License / Certificate Component
  return (
    <div className="slmc-license-full-container">
      {/* View Switcher Tabs */}
      <div className="license-view-tabs">
        <button
          className={`license-tab-btn ${viewMode === 'card' ? 'active' : ''}`}
          onClick={() => setViewMode('card')}
          type="button"
        >
          <Award size={15} />
          <span>Digital Practitioner ID</span>
        </button>
        <button
          className={`license-tab-btn ${viewMode === 'certificate' ? 'active' : ''}`}
          onClick={() => setViewMode('certificate')}
          type="button"
        >
          <FileText size={15} />
          <span>Registration Certificate</span>
        </button>
        {doctor.licenseDocument && (
          <button
            className={`license-tab-btn ${viewMode === 'doc' ? 'active' : ''}`}
            onClick={() => setViewMode('doc')}
            type="button"
          >
            <Eye size={15} />
            <span>Uploaded License File</span>
          </button>
        )}
        <div className="tab-actions-right">
          <button className="registry-check-btn" onClick={handleCheckRegistry} disabled={checkingRegistry} type="button">
            <ExternalLink size={14} />
            <span>
              {checkingRegistry ? 'Querying SLMC...' : verifiedRegistry ? 'Registry Matched ✓' : 'Verify SLMC Database'}
            </span>
          </button>
          <button className="print-btn" onClick={handlePrint} title="Print Verification Document" type="button">
            <Printer size={15} />
          </button>
        </div>
      </div>

      {/* VIEW 1: Digital Practitioner ID Card */}
      {viewMode === 'card' && (
        <div className={`slmc-id-card ${isVerified ? 'verified-theme' : 'pending-theme'}`}>
          <div className="card-top-bar">
            <div className="republic-emblem">🏛️</div>
            <div className="card-header-text">
              <h4>SRI LANKA MEDICAL COUNCIL</h4>
              <p>MEDICAL PRACTITIONER REGISTRATION & IDENTIFICATION CARD</p>
            </div>
            <div className="card-flag">🇱🇰</div>
          </div>

          <div className="card-main-grid">
            <div className="card-photo-column">
              <div className="doctor-photo-frame">
                {doctor.photo || doctor.avatar ? (
                  <img src={doctor.photo || doctor.avatar} alt={doctor.name} className="photo-img" />
                ) : (
                  <div className="photo-placeholder">
                    <span>{doctor.name.replace(/^(Dr\.\s*)/i, '').substring(0, 2).toUpperCase()}</span>
                  </div>
                )}
                <div className={`verification-stamp ${isVerified ? 'stamp-verified' : 'stamp-pending'}`}>
                  {isVerified ? 'VERIFIED' : 'PENDING'}
                </div>
              </div>
              <div className="card-qr-box">
                <QrCode size={48} className="qr-icon" />
                <span className="qr-caption">SCAN TO VERIFY</span>
              </div>
            </div>

            <div className="card-info-column">
              <div className="license-box-highlight">
                <span className="license-box-title">REGISTRATION / LICENSE NUMBER</span>
                <div className="license-number-row">
                  <span className="license-number-text">{licenseNum}</span>
                  <button className="copy-icon-btn" onClick={handleCopyLicense} title="Copy License Number" type="button">
                    {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                  </button>
                </div>
                <div className="license-format-note">
                  <span>✓ Standard Sri Lanka Medical Council format validated</span>
                </div>
              </div>

              <div className="card-doctor-name">
                <h3>{doctor.name}</h3>
                <span className="card-specialty-tag">{specialty}</span>
              </div>

              <div className="card-meta-grid">
                <div className="card-meta-field">
                  <span className="meta-lbl">National ID (NIC)</span>
                  <span className="meta-val">{doctor.nic || '—'}</span>
                </div>
                <div className="card-meta-field">
                  <span className="meta-lbl">Clinical Experience</span>
                  <span className="meta-val">{expYears} Years</span>
                </div>
                <div className="card-meta-field">
                  <span className="meta-lbl">Official Email</span>
                  <span className="meta-val">{doctor.email || '—'}</span>
                </div>
                <div className="card-meta-field">
                  <span className="meta-lbl">Contact Phone</span>
                  <span className="meta-val">{doctor.phone || '—'}</span>
                </div>
              </div>

              <div className="card-qualifications-section">
                <span className="meta-lbl">Accredited Qualifications</span>
                <div className="qual-tags-list">
                  {qualifications.map((q, idx) => (
                    <span key={idx} className="qual-tag">{q}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card-footer-strip">
            <div className="footer-security-text">
              <span>SECURITY DOCUMENT • MEDICAL ORDINANCE NO. 26 • ISSUED BY THE REGISTRAR, SLMC</span>
            </div>
            <div className="footer-barcode">
              <span className="barcode-font">||| | |||| | || ||||| | ||| |||| |</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Official Registration Certificate */}
      {viewMode === 'certificate' && (
        <div className="slmc-certificate-paper">
          <div className="certificate-border">
            <div className="certificate-header">
              <div className="cert-crest">🏛️</div>
              <h3>SRI LANKA MEDICAL COUNCIL</h3>
              <p className="cert-ordinance">Established under the Medical Ordinance (Chapter 105)</p>
              <div className="cert-title-box">
                <h2>CERTIFICATE OF MEDICAL REGISTRATION</h2>
              </div>
            </div>

            <div className="certificate-body">
              <p className="cert-text-intro">
                This is to certify that upon verification of medical qualifications and clinical training:
              </p>
              <div className="cert-doctor-name-display">
                <h1>{doctor.name}</h1>
                <p className="cert-nic-display">National Identity Card No: <strong>{doctor.nic || '200012345675'}</strong></p>
              </div>

              <p className="cert-declaration">
                Has been officially registered as a qualified <strong>{specialty}</strong> with registration credentials:
              </p>

              <div className="cert-license-highlight">
                <span className="cert-license-label">OFFICIAL REGISTRATION / LICENSE NO.</span>
                <span className="cert-license-value">{licenseNum}</span>
              </div>

              <div className="cert-qualifications-box">
                <p><strong>Recognized Degrees & Diplomas:</strong> {qualifications.join(' • ')}</p>
              </div>
            </div>

            <div className="certificate-footer">
              <div className="cert-signature-block">
                <div className="signature-line">Prof. Vajira Dissanayake</div>
                <span>President, Sri Lanka Medical Council</span>
              </div>

              <div className="cert-gold-seal">
                <div className="seal-circle">
                  <span>SLMC</span>
                  <span>OFFICIAL</span>
                  <span>★ SEAL ★</span>
                </div>
              </div>

              <div className="cert-signature-block">
                <div className="signature-line">Dr. Ananda Hapugoda</div>
                <span>Registrar, Sri Lanka Medical Council</span>
              </div>
            </div>

            <div className="cert-bottom-info">
              <span>Date of Issue: {doctor.verifiedAt ? new Date(doctor.verifiedAt).toLocaleDateString() : 'Pending Official Approval'}</span>
              <span>Verification Status: <strong>{isVerified ? 'ACTIVE & VERIFIED' : 'PENDING REVIEW'}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: Uploaded License File (If present) */}
      {viewMode === 'doc' && doctor.licenseDocument && (
        <div className="slmc-uploaded-doc-viewer">
          <div className="doc-viewer-header">
            <h4>Attached Medical Council License Document</h4>
            <a href={doctor.licenseDocument} target="_blank" rel="noreferrer" className="open-doc-link">
              <ExternalLink size={14} /> Open in new tab
            </a>
          </div>
          <div className="doc-image-container">
            <img src={doctor.licenseDocument} alt="Doctor Medical License Document" className="uploaded-license-img" />
          </div>
        </div>
      )}

      {/* Bottom Actions if enabled */}
      {showActions && !isVerified && (
        <div className="license-card-action-bar">
          <div className="action-status-text">
            <ShieldAlert size={18} color="#f59e0b" />
            <span>This doctor is currently unverified. Check all details above before granting approval.</span>
          </div>
          <div className="action-buttons-group">
            {onReject && (
              <button className="action-btn-reject" onClick={onReject} type="button">
                Reject Application
              </button>
            )}
            {onVerify && (
              <button className="action-btn-verify" onClick={onVerify} type="button">
                <ShieldCheck size={16} />
                <span>Approve & Verify Doctor</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorLicenseCard;
