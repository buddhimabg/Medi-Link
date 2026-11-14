const Payment = require('../models/payment');
const Appointment = require('../models/appointment');
const Doctor = require('../models/doctor');
const Patient = require('../models/Patient');
const SystemActivity = require('../models/SystemActivity');
const { logger } = require('../middlewares/logger');

/**
 * Helper to log system activity
 */
const logPaymentActivity = async (userId, activityType, description, metadata = {}) => {
  try {
    await SystemActivity.create({
      userId: userId || null,
      activityType: activityType || 'admin_action',
      description,
      status: 'success',
      resourceType: 'Payment',
      metadata
    });
  } catch (err) {
    if (logger && logger.warn) logger.warn(`Failed to log system activity: ${err.message}`);
  }
};

/**
 * Get all payments with filters, search, pagination, and sorting
 * GET /api/admin/payments
 */
exports.getPayments = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      method,
      search,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Filter by status (e.g. Success, Pending, Canceled, Failed)
    if (status && status !== 'all') {
      // Case insensitive match for status
      query.status = { $regex: new RegExp(`^${status}$`, 'i') };
    }

    // Filter by payment method
    if (method && method !== 'all') {
      query.method = { $regex: new RegExp(method, 'i') };
    }

    // Filter by Date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Filter by Amount range
    if (minAmount !== undefined && minAmount !== '') {
      query.amount = query.amount || {};
      query.amount.$gte = Number(minAmount);
    }
    if (maxAmount !== undefined && maxAmount !== '') {
      query.amount = query.amount || {};
      query.amount.$lte = Number(maxAmount);
    }

    // Keyword search (searches paymentId, cardMasked, cardHolderName, or matching appointment doctor/patient)
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      
      // Find appointments that match the search term (e.g. doctorName, specialty, userId)
      const matchingAppointments = await Appointment.find({
        $or: [
          { doctorName: searchRegex },
          { specialty: searchRegex },
          { userId: searchRegex },
          { cardHolderName: searchRegex }
        ]
      }).select('_id');

      const apptIds = matchingAppointments.map(a => a._id);

      query.$or = [
        { paymentId: searchRegex },
        { cardMasked: searchRegex },
        { cardHolderName: searchRegex },
        { method: searchRegex },
        { status: searchRegex },
        { appointmentId: { $in: apptIds } }
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortOptions = { [sortBy]: sortDirection };

    // Fetch payments and populate appointment details
    const [payments, totalCount] = await Promise.all([
      Payment.find(query)
        .populate({
          path: 'appointmentId',
          select: 'userId doctorId doctorName specialty credentials type slot amount paymentStatus cardHolderName cardNumber'
        })
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Payment.countDocuments(query)
    ]);

    // Format records for frontend consumption
    const formattedPayments = payments.map(p => {
      const appt = p.appointmentId || {};
      return {
        _id: p._id,
        paymentId: p.paymentId || `PAY-${String(p._id).slice(-8).toUpperCase()}`,
        appointmentId: appt._id ? appt._id : (p.appointmentId || null),
        amount: p.amount || 0,
        currency: p.currency || 'LKR',
        status: p.status || 'Pending',
        method: p.method || (p.status === 'Success' ? 'Visa (Local)' : 'Online Payment'),
        cardMasked: p.cardMasked || (appt.cardNumber ? appt.cardNumber : '•••• ••••'),
        cardHolderName: p.cardHolderName || appt.cardHolderName || 'Patient Customer',
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        appointment: {
          id: appt._id || p.appointmentId,
          doctorName: appt.doctorName || 'General Consultation',
          specialty: appt.specialty || 'General Care',
          type: appt.type || 'Virtual',
          slot: appt.slot || 'N/A',
          userId: appt.userId || 'N/A',
          doctorId: appt.doctorId || null
        }
      };
    });

    res.json({
      success: true,
      data: formattedPayments,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum) || 1
      }
    });
  } catch (error) {
    if (logger && logger.error) logger.error(`Error in getPayments: ${error.message}`);
    next(error);
  }
};

/**
 * Get comprehensive real-time revenue and payment analytics
 * GET /api/admin/payments/analytics
 */
exports.getPaymentAnalytics = async (req, res, next) => {
  try {
    const allPayments = await Payment.find().populate('appointmentId').lean();

    const totalTransactions = allPayments.length;

    let totalRevenue = 0;
    let successfulCount = 0;
    let pendingRevenue = 0;
    let pendingCount = 0;
    let canceledRevenue = 0;
    let canceledCount = 0;
    let failedRevenue = 0;
    let failedCount = 0;

    const methodMap = {};
    const doctorRevenueMap = {};

    // Current Date boundaries
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    let todayRevenue = 0;
    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;

    allPayments.forEach(p => {
      const amount = Number(p.amount) || 0;
      const statusLower = (p.status || '').toLowerCase();
      const createdAt = p.createdAt ? new Date(p.createdAt) : new Date();
      const method = p.method || (statusLower === 'success' ? 'Visa (Local)' : 'Online Portal');

      // Method distribution
      if (!methodMap[method]) {
        methodMap[method] = { count: 0, amount: 0 };
      }
      methodMap[method].count += 1;

      if (statusLower === 'success' || statusLower === 'paid' || statusLower === 'completed') {
        totalRevenue += amount;
        successfulCount += 1;
        methodMap[method].amount += amount;

        // Date breakdowns
        if (createdAt >= todayStart) {
          todayRevenue += amount;
        }
        if (createdAt >= thisMonthStart) {
          thisMonthRevenue += amount;
        } else if (createdAt >= lastMonthStart && createdAt <= lastMonthEnd) {
          lastMonthRevenue += amount;
        }

        // Doctor attribution
        if (p.appointmentId && p.appointmentId.doctorName) {
          const docName = p.appointmentId.doctorName;
          if (!doctorRevenueMap[docName]) {
            doctorRevenueMap[docName] = { doctorName: docName, revenue: 0, appointmentsCount: 0 };
          }
          doctorRevenueMap[docName].revenue += amount;
          doctorRevenueMap[docName].appointmentsCount += 1;
        }
      } else if (statusLower === 'pending') {
        pendingRevenue += amount;
        pendingCount += 1;
      } else if (statusLower === 'canceled' || statusLower === 'cancelled') {
        canceledRevenue += amount;
        canceledCount += 1;
      } else {
        failedRevenue += amount;
        failedCount += 1;
      }
    });

    const successRate = totalTransactions > 0 
      ? Number(((successfulCount / totalTransactions) * 100).toFixed(1)) 
      : 0;

    const avgTransactionValue = successfulCount > 0 
      ? Math.round(totalRevenue / successfulCount) 
      : (totalTransactions > 0 ? Math.round((totalRevenue + pendingRevenue) / totalTransactions) : 0);

    // Month-over-month growth calculation
    const revenueGrowth = lastMonthRevenue > 0
      ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
      : (thisMonthRevenue > 0 ? '100.0' : '0.0');

    // 12 Months Revenue Trend
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const revenueTimeline = [];
    
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const targetMonth = targetDate.getMonth();
      const targetYear = targetDate.getFullYear();
      const monthLabel = `${monthNames[targetMonth]} ${targetYear}`;

      // Sum payments for this month
      const monthPayments = allPayments.filter(p => {
        if (!p.createdAt) return false;
        const d = new Date(p.createdAt);
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
      });

      const monthSuccessRevenue = monthPayments
        .filter(p => (p.status || '').toLowerCase() === 'success')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const monthPendingRevenue = monthPayments
        .filter(p => (p.status || '').toLowerCase() === 'pending')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const monthTotalVolume = monthPayments.length;

      revenueTimeline.push({
        month: monthLabel,
        shortMonth: monthNames[targetMonth],
        revenue: monthSuccessRevenue,
        pending: monthPendingRevenue,
        transactions: monthTotalVolume
      });
    }

    // Format payment methods array
    const paymentMethods = Object.keys(methodMap).map(key => ({
      name: key,
      count: methodMap[key].count,
      amount: methodMap[key].amount,
      percentage: totalTransactions > 0 ? Math.round((methodMap[key].count / totalTransactions) * 100) : 0
    }));

    // Status breakdown array
    const statusDistribution = [
      { name: 'Success', count: successfulCount, amount: totalRevenue, color: '#10b981' },
      { name: 'Pending', count: pendingCount, amount: pendingRevenue, color: '#f59e0b' },
      { name: 'Canceled', count: canceledCount, amount: canceledRevenue, color: '#ef4444' },
      { name: 'Failed', count: failedCount, amount: failedRevenue, color: '#6b7280' }
    ].filter(s => s.count > 0 || totalTransactions === 0);

    // Top Doctors by Revenue array
    const topDoctorsByRevenue = Object.values(doctorRevenueMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        currency: 'LKR',
        summary: {
          totalRevenue,
          totalRevenueFormatted: `LKR ${totalRevenue.toLocaleString()}`,
          successfulCount,
          pendingRevenue,
          pendingCount,
          canceledRevenue,
          canceledCount,
          failedRevenue,
          failedCount,
          totalTransactions,
          successRate,
          avgTransactionValue,
          avgTransactionValueFormatted: `LKR ${avgTransactionValue.toLocaleString()}`,
          todayRevenue,
          thisMonthRevenue,
          lastMonthRevenue,
          revenueGrowth: parseFloat(revenueGrowth) >= 0 ? `+${revenueGrowth}%` : `${revenueGrowth}%`
        },
        revenueTimeline,
        paymentMethods,
        statusDistribution,
        topDoctorsByRevenue
      }
    });
  } catch (error) {
    if (logger && logger.error) logger.error(`Error in getPaymentAnalytics: ${error.message}`);
    next(error);
  }
};

/**
 * Get payment by ID
 * GET /api/admin/payments/:id
 */
exports.getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id)
      .populate({
        path: 'appointmentId',
        select: 'userId doctorId doctorName specialty credentials type slot amount paymentStatus cardHolderName cardNumber'
      })
      .lean();

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    const appt = payment.appointmentId || {};

    let patientData = null;
    if (appt.userId) {
      patientData = await Patient.findOne({ $or: [{ userId: appt.userId }, { _id: appt.userId }] }).lean();
    }

    const formatted = {
      _id: payment._id,
      paymentId: payment.paymentId || `PAY-${String(payment._id).slice(-8).toUpperCase()}`,
      amount: payment.amount,
      currency: payment.currency || 'LKR',
      status: payment.status,
      method: payment.method || 'Visa (Local)',
      cardMasked: payment.cardMasked || '•••• ••••',
      cardHolderName: payment.cardHolderName || appt.cardHolderName || 'Customer',
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      appointment: {
        id: appt._id || payment.appointmentId,
        doctorName: appt.doctorName || 'Medical Consultation',
        specialty: appt.specialty || 'General Care',
        type: appt.type || 'Virtual',
        slot: appt.slot || 'N/A',
        userId: appt.userId || 'N/A',
        paymentStatus: appt.paymentStatus || payment.status
      },
      patient: patientData ? {
        name: patientData.name || 'Patient',
        gender: patientData.gender,
        bloodType: patientData.bloodType
      } : null
    };

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    if (logger && logger.error) logger.error(`Error in getPaymentById: ${error.message}`);
    next(error);
  }
};

/**
 * Update payment status (e.g. mark as Success, Refunded, Canceled)
 * PATCH /api/admin/payments/:id/status
 */
exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const validStatuses = ['Success', 'Pending', 'Canceled', 'Failed', 'Refunded'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${validStatuses.join(', ')}`
      });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    const oldStatus = payment.status;
    payment.status = status;
    await payment.save();

    // If appointment exists, sync payment status
    if (payment.appointmentId) {
      const appt = await Appointment.findById(payment.appointmentId);
      if (appt) {
        appt.paymentStatus = status === 'Success' ? 'Paid' : status;
        await appt.save();
      }
    }

    // Log admin system activity
    await logPaymentActivity(
      req.userId,
      'admin_action',
      `Admin updated payment ${payment.paymentId || payment._id} status from ${oldStatus} to ${status}. Note: ${note || 'None'}`
    );

    res.json({
      success: true,
      message: `Payment status successfully updated to ${status}.`,
      data: payment
    });
  } catch (error) {
    if (logger && logger.error) logger.error(`Error in updatePaymentStatus: ${error.message}`);
    next(error);
  }
};

/**
 * Export all payment transactions
 * GET /api/admin/payments/export
 */
exports.exportPayments = async (req, res, next) => {
  try {
    const { status, startDate, endDate } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = { $regex: new RegExp(`^${status}$`, 'i') };
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const payments = await Payment.find(query)
      .populate('appointmentId')
      .sort({ createdAt: -1 })
      .lean();

    const exportRows = payments.map(p => {
      const appt = p.appointmentId || {};
      return {
        Transaction_ID: p.paymentId || `PAY-${String(p._id).slice(-8).toUpperCase()}`,
        Database_ID: p._id,
        Date: p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : 'N/A',
        Time: p.createdAt ? new Date(p.createdAt).toLocaleTimeString() : 'N/A',
        Doctor_Name: appt.doctorName || 'N/A',
        Specialty: appt.specialty || 'N/A',
        Consultation_Type: appt.type || 'N/A',
        Appointment_Slot: appt.slot || 'N/A',
        Amount: p.amount || 0,
        Currency: p.currency || 'LKR',
        Status: p.status || 'Pending',
        Payment_Method: p.method || 'Online Payment',
        Card_Masked: p.cardMasked || 'N/A',
        Card_Holder: p.cardHolderName || appt.cardHolderName || 'N/A'
      };
    });

    res.json({
      success: true,
      total: exportRows.length,
      data: exportRows
    });
  } catch (error) {
    if (logger && logger.error) logger.error(`Error in exportPayments: ${error.message}`);
    next(error);
  }
};
