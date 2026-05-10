import React from "react";

export default function LockoutModal({ open, accountValue, reason, contact, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center  p-4">
      <div className="w-full max-w-xl rounded-[2rem] overflow-hidden bg-white shadow-2xl">
        <div className="bg-yellow-50 px-8 py-10 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100 text-yellow-700 shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2v-9a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 5a3 3 0 016 0v3H9V7zm9 5v9H6v-9h12z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-semibold text-slate-900">Tài khoản bị khóa</h2>
          <p className="mt-3 text-sm text-slate-600">Tài khoản của bạn đã bị tạm khóa</p>
        </div>
        <div className="space-y-4 bg-slate-50 px-8 py-8">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex gap-3">
              <span className="mt-1 text-yellow-600 ">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-slate-900">Tài khoản:</p>
                <p className="mt-1 text-sm text-slate-600 break-all">{accountValue}</p>
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <span className="mt-1 text-yellow-600">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-slate-900">Lý do:</p>
                <p className="mt-1 text-sm text-slate-600">{reason}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-sky-50 p-6 text-slate-700">
            <p className="text-sm font-semibold text-slate-900">Hướng dẫn khôi phục tài khoản:</p>
            <p className="mt-2 text-sm leading-6">
              Vui lòng liên hệ bộ phận quản trị viên UDCK qua email hoặc số điện thoại dưới đây để được hỗ trợ mở khóa tài khoản:
            </p>
            <p className="mt-4 text-sm font-semibold text-slate-900">{contact}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
