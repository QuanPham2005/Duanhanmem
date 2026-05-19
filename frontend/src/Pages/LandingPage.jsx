import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, ArrowRight } from "phosphor-react";

function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-udck-muted/40 text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="rounded-[2rem] border border-slate-200 bg-white p-10 shadow-[0_24px_60px_rgba(0,51,102,0.08)]"
        >
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-udck-muted ring-1 ring-slate-200">
              <GraduationCap size={32} className="text-udck-primary" weight="duotone" />
            </div>
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-udck-primary/80">
                UDCK Appointment System
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                UDCK - Hệ thống đặt lịch tư vấn
              </h1>
              <p className="mx-auto max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                Phân hiệu Đại học Đà Nẵng tại Kon Tum. Đăng nhập bằng tài khoản Sinh viên, Giảng viên hoặc Admin mà không cần chọn loại tài khoản trước.
              </p>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.25 }}>
              <Link
                to="/login"
                className="inline-flex items-center gap-3 rounded-3xl bg-gradient-to-r from-udck-primary to-udck-light px-8 py-4 text-base font-semibold text-white shadow-lg shadow-udck-primary/20 transition duration-300 hover:from-udck-dark hover:to-udck-primary"
              >
                Let&apos;s Go
                <ArrowRight size={20} weight="bold" />
              </Link>
            </motion.div>
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {[
            { title: "Sinh viên", description: "Xem và đặt lịch tư vấn nhanh chóng." },
            { title: "Giảng viên", description: "Quản lý lịch rảnh và xác nhận lịch hẹn." },
            { title: "Admin", description: "Quản trị hệ thống và theo dõi báo cáo." },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition hover:border-udck-primary/20 hover:shadow-[0_20px_48px_rgba(0,51,102,0.1)]"
            >
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-udck-primary to-udck-light text-white shadow-md shadow-udck-primary/15">
                <GraduationCap size={24} weight="bold" />
              </div>
              <h2 className="mt-6 text-xl font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
            </div>
          ))}
        </motion.section>
      </div>
    </div>
  );
}

export default Home;
