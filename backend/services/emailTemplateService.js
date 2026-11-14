/**
 * MediLink Professional HTML Email Template Generator
 */

const getBadgeConfig = (category, priority) => {
  if (priority === 'urgent' || category === 'urgent_alert') {
    return {
      bg: '#FEE2E2',
      text: '#991B1B',
      border: '#F87171',
      label: 'URGENT HEALTH ADVISORY'
    };
  }
  switch (category) {
    case 'doctor_verification':
      return {
        bg: '#FEF3C7',
        text: '#92400E',
        border: '#FCD34D',
        label: 'DOCTOR LICENSING & VERIFICATION'
      };
    case 'appointment':
      return {
        bg: '#E0F2FE',
        text: '#075985',
        border: '#7DD3FC',
        label: 'APPOINTMENT & SCHEDULE UPDATE'
      };
    case 'medical_report':
      return {
        bg: '#DCFCE7',
        text: '#166534',
        border: '#86EFAC',
        label: 'MEDICAL REPORT & LAB RESULTS'
      };
    case 'billing':
      return {
        bg: '#F3E8FF',
        text: '#6B21A8',
        border: '#D8B4FE',
        label: 'BILLING & ACCOUNT STATEMENT'
      };
    case 'announcement':
    default:
      return {
        bg: '#EFF6FF',
        text: '#1E40AF',
        border: '#93C5FD',
        label: 'OFFICIAL MEDILINK NOTICE'
      };
  }
};

/**
 * Generates an HTML email string
 * @param {Object} options
 * @param {string} options.recipientName - Name of the recipient
 * @param {string} options.recipientRole - 'doctor' | 'patient' | 'user'
 * @param {string} options.subject - Email Subject
 * @param {string} options.title - Header Title / Announcement Heading
 * @param {string} options.category - Category key
 * @param {string} options.priority - 'low' | 'normal' | 'high' | 'urgent'
 * @param {string} options.messageBody - Main text (can contain newlines)
 * @param {string} [options.highlightBox] - Optional key details box
 * @param {string} [options.buttonText] - Action button text
 * @param {string} [options.buttonUrl] - Action button link
 * @param {string} [options.sentByName] - Name of sender admin
 */
const generateProfessionalEmailHtml = ({
  recipientName = 'Valued Member',
  recipientRole = 'user',
  subject = 'MediLink Notification',
  title = '',
  category = 'announcement',
  priority = 'normal',
  messageBody = '',
  highlightBox = '',
  buttonText = '',
  buttonUrl = '',
  sentByName = 'MediLink Administration'
}) => {
  const badge = getBadgeConfig(category, priority);
  const formattedTitle = title || subject;

  // Convert plain text newlines into formatted paragraphs
  const paragraphs = String(messageBody)
    .split(/\n{2,}|\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(
      p =>
        `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">${p}</p>`
    )
    .join('');

  const highlightHtml = highlightBox
    ? `
      <div style="margin: 24px 0; padding: 18px 20px; background-color: #F8FAFC; border-left: 4px solid #0C5BD5; border-radius: 0 8px 8px 0;">
        <div style="font-size: 13px; font-weight: 700; color: #0C5BD5; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Important Details</div>
        <div style="font-size: 14px; color: #475569; line-height: 1.6;">${highlightBox.replace(/\n/g, '<br/>')}</div>
      </div>
    `
    : '';

  const buttonHtml =
    buttonText && buttonUrl
      ? `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 32px 0 16px 0;">
        <tr>
          <td align="center">
            <a href="${buttonUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0C5BD5 0%, #1D4ED8 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(12, 91, 213, 0.25); text-align: center; mso-padding-alt: 0; min-width: 200px;">
              <!--[if mso]><i style="letter-spacing: 25px; mso-font-width: -100%; mso-text-raise: 30pt">&nbsp;</i><![endif]-->
              <span style="mso-text-raise: 15pt;">${buttonText} &rarr;</span>
              <!--[if mso]><i style="letter-spacing: 25px; mso-font-width: -100%">&nbsp;</i><![endif]-->
            </a>
          </td>
        </tr>
      </table>
    `
      : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #F1F5F9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03); border: 1px solid #E2E8F0;">
          
          <!-- Top Header Brand Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0C5BD5 0%, #0945A4 100%); padding: 32px 36px 28px 36px; text-align: left;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <!-- Logo & Brand -->
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color: rgba(255, 255, 255, 0.2); border-radius: 10px; width: 42px; height: 42px; text-align: center; vertical-align: middle; font-size: 22px; color: #ffffff; font-weight: bold;">
                          ✚
                        </td>
                        <td style="padding-left: 14px;">
                          <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; line-height: 1.2;">
                            MediLink
                          </h1>
                          <p style="margin: 2px 0 0 0; font-size: 12px; color: #BFDBFE; letter-spacing: 0.5px; text-transform: uppercase;">
                            Healthcare Management Platform
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); color: #ffffff; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              
              <!-- Category Badge -->
              <div style="margin-bottom: 20px;">
                <span style="display: inline-block; background-color: ${badge.bg}; color: ${badge.text}; border: 1px solid ${badge.border}; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 6px; letter-spacing: 0.5px; text-transform: uppercase;">
                  ${badge.label}
                </span>
              </div>

              <!-- Main Heading -->
              <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #0F172A; line-height: 1.35; letter-spacing: -0.3px;">
                ${formattedTitle}
              </h2>

              <!-- Salutation -->
              <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #1E293B;">
                Dear ${recipientName}${recipientRole === 'doctor' ? ' (Dr.)' : ''},
              </p>

              <!-- Paragraphs -->
              ${paragraphs}

              <!-- Highlight Callout Box -->
              ${highlightHtml}

              <!-- Action Button CTA -->
              ${buttonHtml}

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 32px 0 20px 0;" />

              <!-- Sign-off -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 14px; color: #64748B;">
                      Warm regards,<br />
                      <strong style="color: #1E293B; font-size: 14px;">${sentByName}</strong><br />
                      <span style="font-size: 12px; color: #94A3B8;">MediLink Medical Network Operations</span>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 24px 36px; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748B; line-height: 1.5;">
                This is an official system transmission from MediLink Healthcare Platform.<br />
                Please do not reply directly to this automated email.
              </p>
              <p style="margin: 0 0 12px 0; font-size: 11px; color: #94A3B8;">
                &copy; ${new Date().getFullYear()} MediLink Healthcare System. All rights reserved. &bull; Colombo, Sri Lanka
              </p>
              <table border="0" cellpadding="0" cellspacing="0" align="center">
                <tr>
                  <td style="font-size: 11px; color: #0C5BD5;">
                    <a href="http://localhost:5173" style="color: #0C5BD5; text-decoration: none; font-weight: 600;">Visit Portal</a> &nbsp;|&nbsp;
                    <a href="mailto:support@medilink.lk" style="color: #0C5BD5; text-decoration: none; font-weight: 600;">Contact Support</a> &nbsp;|&nbsp;
                    <a href="#" style="color: #0C5BD5; text-decoration: none; font-weight: 600;">Privacy Policy</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- Micro Footer / Security Text -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin-top: 16px;">
          <tr>
            <td align="center" style="font-size: 11px; color: #94A3B8; line-height: 1.4;">
              🔒 Encrypted HIPAA & SLMC Compliant Healthcare Communication &bull; Confidential
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

/**
 * Pre-defined Templates Library
 */
const DEFAULT_TEMPLATES = [
  {
    id: 'general_announcement',
    name: 'Hospital / System Announcement',
    category: 'announcement',
    priority: 'normal',
    badge: 'Official MediLink Notice',
    icon: 'Megaphone',
    description: 'Broadcast general updates, system changes, or clinic opening hours.',
    defaultSubject: 'Important Update from MediLink Healthcare',
    defaultTitle: 'Notice: Platform Improvements & Schedule Updates',
    defaultBody:
      'We are committed to providing you with the highest standard of healthcare services. We are writing to notify you about recent updates and enhancements implemented across the MediLink network.\n\nOur digital consulting and appointment scheduling services are fully operational. If you need any assistance, our clinical support team is available 24/7.',
    defaultHighlight:
      '📅 Effective Date: Immediate\n🏥 Affected Departments: All Clinical & Outpatient Services\n📞 Support Hotline: +94 11 234 5678',
    defaultButtonText: 'Access MediLink Portal',
    defaultButtonUrl: 'http://localhost:5173'
  },
  {
    id: 'appointment_notice',
    name: 'Appointment & Schedule Update',
    category: 'appointment',
    priority: 'high',
    badge: 'Appointment & Schedule Update',
    icon: 'Calendar',
    description: 'Send appointment confirmations, schedule changes, or doctor clinic updates.',
    defaultSubject: 'Your MediLink Appointment & Consultation Notice',
    defaultTitle: 'Appointment Information & Clinic Instructions',
    defaultBody:
      'This is an official notice regarding clinical consultations and doctor scheduling at MediLink.\n\nPlease ensure you review your appointment time and arrive 15 minutes before the scheduled session. For virtual video consultations, please check your camera and microphone beforehand in the portal.\n\nThank you for choosing MediLink for your personalized healthcare needs.',
    defaultHighlight:
      '⏰ Check-in: 15 minutes prior to session\n📍 Location: MediLink Medical Center / Online Video Room\n📋 Required: NIC / Identification & Previous Prescriptions',
    defaultButtonText: 'View My Appointments',
    defaultButtonUrl: 'http://localhost:5173/history'
  },
  {
    id: 'medical_report',
    name: 'Medical Report & Lab Results Ready',
    category: 'medical_report',
    priority: 'high',
    badge: 'Medical Report & Lab Results',
    icon: 'FileText',
    description: 'Notify patients that their diagnostic lab report or doctor analysis is ready.',
    defaultSubject: 'Your Diagnostic Lab Report is Now Available - MediLink',
    defaultTitle: 'Clinical Lab Report & Diagnostic Summary Ready',
    defaultBody:
      'Your recent medical laboratory test results have been verified by our clinical pathologists and are now securely available in your MediLink account.\n\nYou can view, download, or share the verified PDF report with your specialist doctor directly through your patient dashboard.',
    defaultHighlight:
      '🔒 Security: 256-bit Encrypted Medical Document\n🩺 Next Steps: Schedule a follow-up consultation with your doctor\n📁 Format: Downloadable Digital PDF Report',
    defaultButtonText: 'Download & View Report',
    defaultButtonUrl: 'http://localhost:5173/reports'
  },
  {
    id: 'doctor_verification',
    name: 'Doctor SLMC Verification & License Notice',
    category: 'doctor_verification',
    priority: 'high',
    badge: 'Doctor Licensing & Verification',
    icon: 'ShieldCheck',
    description: 'Official notice to doctors regarding credential verification, SLMC status, or portal access.',
    defaultSubject: 'MediLink Doctor Verification & Credential Notice',
    defaultTitle: 'Official Medical Council & Credential Review Notice',
    defaultBody:
      'Dear Doctor, this is an official message from the MediLink Medical Verification Board.\n\nWe are currently updating our verified practitioner directory in compliance with Sri Lanka Medical Council (SLMC) guidelines. Please review your profile, verify your practicing schedule, and ensure all specialty certificates are up to date.\n\nVerified status unlocks instant patient booking, e-prescriptions, and encrypted telemedicine consultation features.',
    defaultHighlight:
      '📋 Action: Review SLMC Registration & Specialty Details\n🩺 Access: Telemedicine Video Suite & E-Prescriptions\n⏱️ Processing Time: Within 24-48 Hours of submission',
    defaultButtonText: 'Open Doctor Portal',
    defaultButtonUrl: 'http://localhost:5173/doctor-dashboard'
  },
  {
    id: 'urgent_alert',
    name: 'Urgent Health Advisory / Emergency Notice',
    category: 'urgent_alert',
    priority: 'urgent',
    badge: 'Urgent Health Advisory',
    icon: 'AlertTriangle',
    description: 'Broadcast urgent medical advisories, emergency updates, or critical health reminders.',
    defaultSubject: 'URGENT: Important Health Advisory from MediLink',
    defaultTitle: 'Urgent Health Alert & Safety Advisory',
    defaultBody:
      'Please be advised of an urgent health advisory issued by MediLink Healthcare.\n\nWe advise all patients and practitioners to adhere strictly to healthcare safety guidelines. If you are experiencing acute symptoms or emergency distress, please contact our emergency hotline immediately or visit the nearest emergency medical facility.',
    defaultHighlight:
      '🚨 EMERGENCY HOTLINE: 1990 (Toll Free) / +94 11 999 8888\n⚠️ Immediate Action: Seek urgent medical attention if experiencing chest pain, high fever, or breathing difficulty.',
    defaultButtonText: 'Emergency Assistance',
    defaultButtonUrl: 'http://localhost:5173/dashboard'
  },
  {
    id: 'custom',
    name: 'Custom Branded Message',
    category: 'custom',
    priority: 'normal',
    badge: 'Official MediLink Notice',
    icon: 'Mail',
    description: 'Compose a custom notification tailored for specific recipients or groups.',
    defaultSubject: 'Message from MediLink Healthcare Management',
    defaultTitle: 'Notice from MediLink Administration',
    defaultBody:
      'We hope this email finds you well.\n\nThis is a communication regarding your MediLink account and healthcare services. Please feel free to reach out to our team if you have any questions or require further assistance.',
    defaultHighlight: '',
    defaultButtonText: 'Visit MediLink',
    defaultButtonUrl: 'http://localhost:5173'
  }
];

module.exports = {
  generateProfessionalEmailHtml,
  DEFAULT_TEMPLATES
};
