import React from "react";
import { createPortal } from "react-dom";

export default function ConfirmModal({ open, title = "Xác nhận", description = "Bạn có chắc không?", onConfirm, onCancel, confirmText = "Xác nhận", cancelText = "Hủy", loading = false, children }) {
  if (!open || typeof document === "undefined") return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          {description && <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{description}</p>}
          {children}
          <div className="flex gap-3 justify-end mt-6">
            <button 
              onClick={onCancel} 
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 disabled:opacity-50" 
              disabled={loading}
            >
              {cancelText}
            </button>
            <button 
              onClick={onConfirm} 
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50" 
              disabled={loading}
            >
              {loading ? "Đang xử lý..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
