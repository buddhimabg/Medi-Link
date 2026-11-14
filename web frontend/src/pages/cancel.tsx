import React from 'react';
import { X, Clock, MapPin } from 'lucide-react';
import './cancel.css';

//  PROPS INTERFACE 
// Defines what data this component receives
interface CancelDialogProps {
  isOpen: boolean;                                    // Controls if dialog is visible
  onClose: () => void;                                // Function to close dialog
  onConfirm: () => void;                              // Function to confirm cancellation
  appointment: {                                      // Appointment details to display
    startTime: string;
    endTime: string;
    hospital: string;
    location: string;
  } | null;
}

//  CANCEL DIALOG COMPONENT 
const CancelDialog: React.FC<CancelDialogProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  appointment 
}) => {
  // Don't show anything if dialog is closed or no appointment data
  if (!isOpen || !appointment) return null;

  return (
    // Dark background overlay - closes when clicked outside
    <div className="dialog-overlay" onClick={onClose}>
      {/* White dialog box - prevents closing when clicking inside */}
      <div className="dialog-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Close button (X) at top right */}
        <button className="dialog-close" onClick={onClose}>
          <X size={18} />
        </button>
        
        {/* Main content area */}
        <div style={{ padding: '24px 24px 24px 24px' }}>
          
          {/* Dialog title */}
          <h2 className="dialog-title">Cancel Session</h2>
          
          {/* Confirmation question */}
          <p className="dialog-question">
            Are you sure you want to cancel this session?
          </p>
          
          {/* Appointment details box */}
          <div className="dialog-details">
            {/* Time display with clock icon */}
            <div className="dialog-detail">
              <Clock size={16} className="dialog-icon" />
              <span>{appointment.startTime} - {appointment.endTime}</span>
            </div>
            
            {/* Location display with pin icon */}
            <div className="dialog-detail">
              <MapPin size={16} className="dialog-icon" />
              <span>{appointment.hospital}, {appointment.location}</span>
            </div>
          </div>
          
          {/* Warning message */}
          <p className="dialog-warning">
            This action cannot be undone.
          </p>
          
          {/* Action buttons */}
          <div className="dialog-buttons">
            {/* No button - just closes dialog */}
            <button className="dialog-btn dialog-btn-no" onClick={onClose}>
              No
            </button>
            
            {/* Yes button - confirms cancellation */}
            <button className="dialog-btn dialog-btn-yes" onClick={onConfirm}>
              Yes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelDialog;