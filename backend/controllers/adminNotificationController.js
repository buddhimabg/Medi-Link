const nodemailer = require('nodemailer');
const User = require('../models/user');
const Doctor = require('../models/doctor');
const Patient = require('../models/Patient');
const EmailLog = require('../models/EmailLog');
const { generateProfessionalEmailHtml, DEFAULT_TEMPLATES } = require('../services/emailTemplateService');

/**
 * Helper to build Nodemailer Transporter
 */
const getTransporter = () => {
  const user = process.env.SMTP_USER || 'pavindugrx11@gmail.com';
  const pass = (process.env.SMTP_PASS || 'qfkn asqp moln yswr').replace(/\s+/g, '');

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass
    }
  });
};

/**
 * @desc Get SMTP Server Status
 * @route GET /api/admin/notifications/smtp-status
 */
exports.getSmtpStatus = async (req, res) => {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    return res.status(200).json({
      success: true,
      data: {
        connected: true,
        smtpUser: process.env.SMTP_USER || 'pavindugrx11@gmail.com',
        host: 'smtp.gmail.com',
        service: 'Gmail'
      }
    });
  } catch (error) {
    return res.status(200).json({
      success: false,
      data: {
        connected: false,
        error: error.message,
        smtpUser: process.env.SMTP_USER || 'pavindugrx11@gmail.com'
      }
    });
  }
};

/**
 * @desc Get available Email Templates
 * @route GET /api/admin/notifications/templates
 */
exports.getTemplates = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: DEFAULT_TEMPLATES
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
};

/**
 * @desc Get Recipients List (Doctors and Patients)
 * @route GET /api/admin/notifications/recipients
 */
exports.getRecipients = async (req, res) => {
  try {
    // 1. Fetch Doctors from Doctor model & User model
    const doctors = await Doctor.find()
      .populate('userId', 'name email mobile role')
      .select('name email phone specialty address isVerified status photo imageUrl')
      .lean();

    const formattedDoctors = doctors
      .map((doc) => {
        const email = doc.email || doc.userId?.email || '';
        const name = doc.name || doc.userId?.name || 'Doctor';
        const phone = doc.phone || doc.userId?.mobile || '';
        const specialty = doc.specialty || doc.specialization || 'General Practitioner';
        const status = doc.status || 'Active';

        return {
          id: doc._id.toString(),
          name,
          email,
          phone,
          specialty,
          role: 'doctor',
          status,
          isVerified: doc.isVerified ?? false,
          avatar: doc.photo || doc.imageUrl || ''
        };
      })
      .filter((d) => d.email && d.email.includes('@'));

    // 2. Fetch Patients from Patient collection (matching Manage Patients database source)
    const patients = await Patient.find()
      .populate('userId', 'name email phone mobile gender city address profileImage')
      .populate({
        path: 'assignedDoctor',
        select: 'name userId',
        populate: {
          path: 'userId',
          select: 'name'
        }
      })
      .lean();

    const formattedPatients = patients
      .map((p) => {
        const name = typeof p.name === 'string' && p.name.trim() ? p.name.trim() : (p.userId?.name || 'Patient');
        const email = (p.email || p.userId?.email || '').trim();
        const phone = p.phone || p.mobile || p.userId?.phone || p.userId?.mobile || '';
        const rawGender = p.gender || p.userId?.gender || 'Not specified';
        const gender = typeof rawGender === 'string'
          ? (rawGender.charAt(0).toUpperCase() + rawGender.slice(1).toLowerCase())
          : 'Not specified';
        const rawStatus = typeof p.status === 'string' ? p.status.toLowerCase() : 'active';
        const status = rawStatus === 'inactive' ? 'Inactive' : rawStatus === 'suspended' ? 'Suspended' : 'Active';
        
        let assignedDocName = '';
        if (p.assignedDoctor) {
          if (typeof p.assignedDoctor === 'string') {
            assignedDocName = p.assignedDoctor;
          } else if (typeof p.assignedDoctor === 'object') {
            assignedDocName = p.assignedDoctor.name || p.assignedDoctor.userId?.name || '';
          }
        }

        const city = p.address || p.city || p.userId?.address || p.userId?.city || (assignedDocName ? `Dr. ${assignedDocName.replace(/^Dr\.\s*/i, '')}` : 'Patient');

        return {
          id: p._id.toString(),
          name,
          email,
          phone,
          gender,
          city,
          role: 'patient',
          status,
          avatar: p.profileImage || p.avatar || p.userId?.profileImage || ''
        };
      })
      .filter((p) => p.email && p.email.includes('@'));

    // Count totals
    return res.status(200).json({
      success: true,
      data: {
        doctors: formattedDoctors,
        patients: formattedPatients,
        totalDoctors: formattedDoctors.length,
        totalPatients: formattedPatients.length,
        totalRecipients: formattedDoctors.length + formattedPatients.length
      }
    });
  } catch (error) {
    console.error('Error fetching recipients:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch recipients list',
      error: error.message
    });
  }
};

/**
 * @desc Send Test Email to specified address
 * @route POST /api/admin/notifications/test
 */
exports.sendTestEmail = async (req, res) => {
  try {
    const {
      testEmail,
      subject = 'MediLink Test Notification',
      title = 'Test Email Transmission',
      category = 'announcement',
      priority = 'normal',
      messageBody = 'This is a test notification sent from the MediLink Administration Panel to verify that SMTP delivery and HTML rendering are working flawlessly.',
      highlightBox = '✅ SMTP Service: Active\n📧 Delivered to: Test Inbox\n🔒 Encryption: TLS / SSL',
      buttonText = 'Open MediLink Portal',
      buttonUrl = 'http://localhost:5173'
    } = req.body;

    const recipient = testEmail || process.env.SMTP_USER || 'pavindugrx11@gmail.com';

    if (!recipient || !recipient.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'A valid test email address is required.'
      });
    }

    const html = generateProfessionalEmailHtml({
      recipientName: 'Administrator (Test)',
      recipientRole: 'admin',
      subject: `[TEST] ${subject}`,
      title,
      category,
      priority,
      messageBody,
      highlightBox,
      buttonText,
      buttonUrl,
      sentByName: req.user?.name || 'MediLink Administrator'
    });

    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'MediLink Healthcare'}" <${process.env.SMTP_USER || 'pavindugrx11@gmail.com'}>`,
      to: recipient,
      subject: `[TEST PREVIEW] ${subject}`,
      html
    });

    return res.status(200).json({
      success: true,
      message: `Test email successfully sent to ${recipient}`,
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Test email error:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to send test email: ${error.message}`,
      error: error.message
    });
  }
};

/**
 * @desc Send Notification Broadcast Email
 * @route POST /api/admin/notifications/send
 */
exports.sendNotificationBroadcast = async (req, res) => {
  try {
    const {
      targetType = 'all_patients', // 'all_patients' | 'all_doctors' | 'selected_doctors' | 'selected_patients' | 'custom' | 'mixed'
      selectedRecipientIds = [],
      customEmails = [], // string or array of emails
      templateId = 'custom',
      templateName = 'Custom Notification',
      category = 'announcement',
      priority = 'normal',
      subject,
      title,
      messageBody,
      highlightBox = '',
      buttonText = '',
      buttonUrl = ''
    } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: 'Email subject is required.' });
    }

    if (!messageBody || !messageBody.trim()) {
      return res.status(400).json({ success: false, message: 'Message body is required.' });
    }

    // 1. Resolve Target Recipients List
    let targetRecipients = []; // [{ email, name, role }]

    if (targetType === 'all_doctors') {
      const doctors = await Doctor.find()
        .populate('userId', 'name email')
        .select('name email')
        .lean();
      doctors.forEach((d) => {
        const email = d.email || d.userId?.email;
        const name = d.name || d.userId?.name || 'Doctor';
        if (email && email.includes('@')) {
          targetRecipients.push({ email: email.trim().toLowerCase(), name, role: 'doctor' });
        }
      });
    } else if (targetType === 'all_patients') {
      const patients = await Patient.find()
        .populate('userId', 'name email')
        .lean();
      patients.forEach((p) => {
        const email = p.email || p.userId?.email;
        const name = p.name || p.userId?.name || 'Patient';
        if (email && email.includes('@')) {
          targetRecipients.push({ email: email.trim().toLowerCase(), name, role: 'patient' });
        }
      });
    } else if (targetType === 'selected_doctors' || targetType === 'selected_patients' || targetType === 'mixed') {
      if (selectedRecipientIds.length > 0) {
        // Find matching doctors
        const doctors = await Doctor.find({ _id: { $in: selectedRecipientIds } })
          .populate('userId', 'name email')
          .select('name email')
          .lean();
        doctors.forEach((d) => {
          const email = d.email || d.userId?.email;
          const name = d.name || d.userId?.name || 'Doctor';
          if (email && email.includes('@')) {
            targetRecipients.push({ email: email.trim().toLowerCase(), name, role: 'doctor' });
          }
        });

        // Find matching patients from Patient collection
        const patients = await Patient.find({ _id: { $in: selectedRecipientIds } })
          .populate('userId', 'name email')
          .lean();
        patients.forEach((p) => {
          const email = p.email || p.userId?.email;
          const name = p.name || p.userId?.name || 'Patient';
          if (email && email.includes('@')) {
            targetRecipients.push({
              email: email.trim().toLowerCase(),
              name,
              role: 'patient'
            });
          }
        });

        // Fallback check against User collection in case ID was user ID
        const users = await User.find({ _id: { $in: selectedRecipientIds } })
          .select('name email role')
          .lean();
        users.forEach((u) => {
          if (u.email && u.email.includes('@')) {
            targetRecipients.push({
              email: u.email.trim().toLowerCase(),
              name: u.name || 'Valued User',
              role: u.role || 'patient'
            });
          }
        });
      }
    }

    // Add any custom emails provided
    if (customEmails) {
      const emailList = Array.isArray(customEmails)
        ? customEmails
        : String(customEmails)
            .split(/[,;\n]/)
            .map((e) => e.trim())
            .filter(Boolean);

      emailList.forEach((email) => {
        if (email.includes('@')) {
          targetRecipients.push({
            email: email.trim().toLowerCase(),
            name: email.split('@')[0],
            role: 'user'
          });
        }
      });
    }

    // Deduplicate by email
    const uniqueMap = new Map();
    targetRecipients.forEach((item) => {
      if (!uniqueMap.has(item.email)) {
        uniqueMap.set(item.email, item);
      }
    });
    targetRecipients = Array.from(uniqueMap.values());

    if (targetRecipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid recipient email addresses found for the selected audience.'
      });
    }

    const transporter = getTransporter();
    const sentByName = req.user?.name || 'MediLink Administrator';

    const deliveryResults = [];
    let successCount = 0;
    let failedCount = 0;

    // Send emails sequentially or in parallel batches of 5 to respect Gmail rate limits
    for (const recipient of targetRecipients) {
      try {
        const html = generateProfessionalEmailHtml({
          recipientName: recipient.name,
          recipientRole: recipient.role,
          subject,
          title: title || subject,
          category,
          priority,
          messageBody,
          highlightBox,
          buttonText,
          buttonUrl,
          sentByName
        });

        await transporter.sendMail({
          from: `"${process.env.SMTP_FROM_NAME || 'MediLink Healthcare'}" <${process.env.SMTP_USER || 'pavindugrx11@gmail.com'}>`,
          to: recipient.email,
          subject,
          html
        });

        deliveryResults.push({
          email: recipient.email,
          name: recipient.name,
          role: recipient.role,
          status: 'sent',
          error: null
        });
        successCount++;
      } catch (sendErr) {
        console.error(`Failed sending to ${recipient.email}:`, sendErr.message);
        deliveryResults.push({
          email: recipient.email,
          name: recipient.name,
          role: recipient.role,
          status: 'failed',
          error: sendErr.message
        });
        failedCount++;
      }
    }

    const overallStatus =
      failedCount === 0 ? 'sent' : successCount === 0 ? 'failed' : 'partially_failed';

    // 3. Save to EmailLog in MongoDB
    const emailLog = new EmailLog({
      subject,
      templateId,
      templateName,
      category,
      priority,
      targetType,
      recipients: deliveryResults,
      recipientCount: targetRecipients.length,
      successCount,
      failedCount,
      title: title || subject,
      messageBody,
      highlightBox,
      buttonText,
      buttonUrl,
      sentByName,
      status: overallStatus
    });

    await emailLog.save();

    return res.status(200).json({
      success: true,
      message: `Notification broadcast completed: ${successCount} sent, ${failedCount} failed.`,
      data: {
        logId: emailLog._id,
        totalRecipients: targetRecipients.length,
        successCount,
        failedCount,
        status: overallStatus
      }
    });
  } catch (error) {
    console.error('Send broadcast error:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to broadcast notification: ${error.message}`,
      error: error.message
    });
  }
};

/**
 * @desc Get Email Logs History
 * @route GET /api/admin/notifications/logs
 */
exports.getEmailLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '15', 10);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      EmailLog.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EmailLog.countDocuments()
    ]);

    return res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notification logs',
      error: error.message
    });
  }
};

/**
 * @desc Get Single Email Log by ID
 * @route GET /api/admin/notifications/logs/:id
 */
exports.getEmailLogById = async (req, res) => {
  try {
    const log = await EmailLog.findById(req.params.id).lean();
    if (!log) {
      return res.status(404).json({ success: false, message: 'Notification log not found' });
    }
    return res.status(200).json({ success: true, data: log });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notification log',
      error: error.message
    });
  }
};
