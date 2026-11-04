"use client";

import { useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

interface SwipeToSubmitProps {
  onConfirm: () => void;
  text?: string;
  disabled?: boolean;
}

export function SwipeToSubmit({ onConfirm, text = "Swipe up to place trade", disabled = false }: SwipeToSubmitProps) {
  const startY = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const finish = () => {
    if (offset <= -48 && !disabled) onConfirm();
    startY.current = null;
    setOffset(0);
    setDragging(false);
  };

  return (
    <div className={`swipe-submit ${disabled ? "is-disabled" : ""}`} data-dragging={dragging}>
      <span aria-hidden="true">{text}</span>
      <button
        type="button"
        className="swipe-submit-handle"
        aria-label="Submit trade"
        disabled={disabled}
        style={{ transform: `translateY(${offset}px)` }}
        onPointerDown={(event) => {
          if (disabled) return;
          startY.current = event.clientY;
          setDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (startY.current === null || disabled) return;
          setOffset(Math.max(-48, Math.min(0, event.clientY - startY.current)));
        }}
        onPointerUp={finish}
        onPointerCancel={() => {
          startY.current = null;
          setOffset(0);
          setDragging(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!disabled) onConfirm();
          }
        }}
      >
        <ArrowUp size={22} aria-hidden="true" />
      </button>
    </div>
  );
}
