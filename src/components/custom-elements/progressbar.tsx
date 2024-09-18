import React from "react";

interface ProgressBarProps {
  steps: number; // Total number of steps
  currentStep: number; // Current step, indicating progress
}

export default function ProgressBar({ steps, currentStep }: ProgressBarProps) {
  // Calculate percentage for progress bar based on the number of steps
  const progressPercentage = (currentStep / (steps - 1)) * 100;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "50px",
        margin: "10px 0",
      }}
    >
      {/* Background Line */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "0",
          width: "100%",
          height: "5px",
          backgroundColor: "#e0e0df",
          zIndex: 1,
          transform: "translateY(-50%)",
        }}
      />

      {/* Progress Line */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "0",
          width: `${progressPercentage}%`,
          height: "5px",
          backgroundColor: "#76c7c0",
          zIndex: 2,
          transform: "translateY(-50%)",
          transition: "width 0.7s ease",
        }}
      />

      {/* Step Circles */}
      {[...Array(steps)].map((_, index) => {
        const isCompleted = index <= currentStep;
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              top: "50%",
              left: `${(index / (steps - 1)) * 100}%`,
              transform: "translate(-50%, -50%)",
              zIndex: 3,
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              backgroundColor: isCompleted ? "#76c7c0" : "#e0e0df",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isCompleted ? "#fff" : "#000",
              fontWeight: "bold",
              fontSize: "14px",
              transition: "background-color 0.3s ease",
            }}
          >
            {index + 1}
          </div>
        );
      })}
    </div>
  );
}
