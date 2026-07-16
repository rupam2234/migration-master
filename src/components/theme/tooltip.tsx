"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { InfoIcon } from "lucide-react";

interface ToolTipProps {
  content: string | React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  /**
   * sets a difault trigger <Infoicon/> -> optional
   */
  trigger?: React.ReactNode;
  width?: string; // e.g., "300px" or "20rem"
  delay?: number;
}

export default function ToolTip({
  content,
  side = "left",
  trigger = (
    <InfoIcon
      size={16}
      className="text-primary/60 cursor-help hover:bg-primary/5 rounded-full transition-colors"
    />
  ),
  width = "300px",
  delay = 300,
}: ToolTipProps) {
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const triggerRef = useRef<HTMLSpanElement>(null);
  const showTimeout = useRef<NodeJS.Timeout | null>(null);
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect());
    }
  };

  const handleMouseEnter = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);

    showTimeout.current = setTimeout(() => {
      updatePosition();
      setVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (showTimeout.current) clearTimeout(showTimeout.current);

    hideTimeout.current = setTimeout(() => {
      setVisible(false);
    }, 120); // small buffer prevents flicker
  };

  useEffect(() => {
    if (!visible) return;

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [visible]);

  const spacing = 8;

  const getPositionStyle = (): React.CSSProperties => {
    if (!rect) return {};

    switch (side) {
      case "top":
        return {
          top: rect.top - spacing,
          left: rect.left + rect.width / 2,
          transform: "translate(-50%, -100%)",
        };
      case "right":
        return {
          top: rect.top + rect.height / 2,
          left: rect.right + spacing,
          transform: "translateY(-50%)",
        };
      case "bottom":
        return {
          top: rect.bottom + spacing,
          left: rect.left + rect.width / 2,
          transform: "translate(-50%, 0)",
        };
      case "left":
      default:
        return {
          top: rect.top + rect.height / 2,
          left: rect.left - spacing,
          transform: "translate(-100%, -50%)",
        };
    }
  };

  const arrowBase = "absolute w-0 h-0 border-transparent";

  const getArrowClasses = () => {
    switch (side) {
      case "top":
        return "bottom-[-8px] left-1/2 -translate-x-1/2 border-x-8 border-t-8 border-t-gray-700";
      case "right":
        return "left-[-8px] top-1/2 -translate-y-1/2 border-y-8 border-r-8 border-r-gray-700";
      case "bottom":
        return "top-[-8px] left-1/2 -translate-x-1/2 border-x-8 border-b-8 border-b-gray-700";
      case "left":
      default:
        return "right-[-8px] top-1/2 -translate-y-1/2 border-y-8 border-l-8 border-l-gray-700";
    }
  };

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex cursor-help"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {trigger}
      </span>

      {visible &&
        rect &&
        createPortal(
          <div
            className="fixed z-9999 pointer-events-auto"
            style={getPositionStyle()}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div
              className="relative p-2 text-xs text-white bg-gray-700 rounded shadow-md"
              style={{ width }}
            >
              <div className={clsx(arrowBase, getArrowClasses())} />
              {content}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
