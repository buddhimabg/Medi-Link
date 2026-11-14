import React from 'react';
import './CheckInStepper.css';

interface CheckInStepperProps {
  currentStep: number;
}

const CheckInStepper: React.FC<CheckInStepperProps> = ({ currentStep }) => {
  const steps = [
    { label: 'Mood & Notes' },
    { label: 'Wellbeing 1/2' },
    { label: 'Wellbeing 2/2' }
  ];

  return (
    <div className="modern-stepper-wrapper">
      <div className="stepper-container">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          
          return (
            <div 
              key={stepNumber} 
              className={`stepper-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
            >
              <div className="step-circle">
                {isCompleted ? (
                  <svg className="checkmark-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <span>{stepNumber}</span>
                )}
              </div>
              <div className="step-label">{step.label}</div>
              {index < steps.length - 1 && (
                <div className={`step-connector ${isCompleted ? 'completed-line' : ''}`}></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CheckInStepper;
