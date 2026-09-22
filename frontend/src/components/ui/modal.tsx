import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "md",
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-none">
      <div
        className={`w-full ${maxWidths[maxWidth]} border-2 border-black rounded-[5px] shadow-[6px_6px_0px_#000] bg-white p-6 relative animate-pop-in`}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-black">
          <h2 className="text-lg font-black uppercase tracking-tight text-black">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
            <X className="w-5 h-5 text-black" />
          </Button>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
};
