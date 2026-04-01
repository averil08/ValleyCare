import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Info,
  Calendar,
  User,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Reusable Notification Modal using Radix UI (via shadcn/ui)
 * Used for both Secretary and Patient notifications.
 */
const NotificationModal = ({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  type = "info", // "success" | "error" | "warning" | "info" | "appointment" | "cancel"
  data = null, // Extra data like appointment details
  actionLabel = "Close",
  onAction = null
}) => {
  
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-12 h-12 text-green-500" />;
      case "error":
      case "cancel":
        return <XCircle className="w-12 h-12 text-red-500" />;
      case "warning":
        return <AlertCircle className="w-12 h-12 text-amber-500" />;
      case "appointment":
        return <Calendar className="w-12 h-12 text-purple-500" />;
      case "info":
      default:
        return <Info className="w-12 h-12 text-blue-500" />;
    }
  };

  const getTypeStyles = () => {
    switch (type) {
      case "success": return "bg-green-50 border-green-200";
      case "error":
      case "cancel": return "bg-red-50 border-red-200";
      case "warning": return "bg-amber-50 border-amber-200";
      case "appointment": return "bg-purple-50 border-purple-200";
      default: return "bg-blue-50 border-blue-200";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-none shadow-2xl p-0 overflow-hidden rounded-2xl animate-in zoom-in-95 duration-200">
        <div className={cn("p-6 flex flex-col items-center text-center gap-4", getTypeStyles())}>
          <div className="p-3 bg-white rounded-full shadow-sm">
            {getIcon()}
          </div>
          <DialogHeader className="p-0 space-y-2">
            <DialogTitle className="text-2xl font-bold text-gray-900 leading-tight">
              {title}
            </DialogTitle>
            <DialogDescription className="text-gray-600 text-base">
              {description}
            </DialogDescription>
          </DialogHeader>
        </div>

        {data && (
          <div className="p-6 bg-white border-t border-gray-100">
            <div className="grid grid-cols-1 gap-4">
              {data.patientName && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Patient</p>
                    <p className="text-sm font-semibold text-gray-800">{data.patientName}</p>
                  </div>
                </div>
              )}
              {data.dateTime && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <Clock className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Schedule</p>
                    <p className="text-sm font-semibold text-gray-800">{data.dateTime}</p>
                  </div>
                </div>
              )}
              {data.reason && (
                <div className="p-3 bg-red-50/50 rounded-xl border border-red-100 mt-2">
                  <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider mb-1">Reason for Decline</p>
                  <p className="text-xs text-red-700 italic">"{data.reason}"</p>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="p-4 bg-gray-50 flex sm:justify-center gap-3">
          <Button 
            onClick={() => {
              if (onAction) onAction();
              onClose();
            }}
            className={cn(
              "w-full sm:w-auto min-w-[120px] font-bold py-6 text-base rounded-xl transition-all shadow-md active:scale-95",
              type === "success" ? "bg-green-600 hover:bg-green-700 text-white" :
              type === "cancel" || type === "error" ? "bg-red-600 hover:bg-red-700 text-white" :
              type === "appointment" ? "bg-purple-600 hover:bg-purple-700 text-white" :
              "bg-blue-600 hover:bg-blue-700 text-white"
            )}
          >
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationModal;
