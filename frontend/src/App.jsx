import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import Studentsignup from "./components/Signup/Student";
import UnifiedLogin from "./components/Login/UnifiedLogin";
import LandingPage from "./Pages/LandingPage";

// route groups
import StudentRoutes from "./routes/StudentRoutes";
import LecturerRoutes from "./routes/LecturerRoutes";
import AdminRoutes from "./routes/AdminRoutes";
import PageTransition from "./components/UI/PageTransition";

import Navbar from "./components/UI/Navbar";
import NotFound from "./Pages/NotFound";
import TodayDate from "./components/UI/TodayDate";
import Spinner from "./components/UI/Spinner";

// legacy pages (to be removed later)
import ApproveStudent from "./Pages/ApproveStudent";

function App() {
  const location = useLocation();

  useEffect(() => {
    // Preserve login state on reload. Only reset UI theme state here.
    document.documentElement.classList.remove("dark");
  }, []);

  // Chỉ ẩn Navbar/TodayDate trong khu vực dashboard sau đăng nhập.
  // Các trang login/signup nên hiển thị đồng nhất cho cả Student/Teacher/Admin.
  const hideNav =
    location.pathname.startsWith("/student/dashboard") ||
    location.pathname.startsWith("/lecturer/dashboard") ||
    location.pathname.startsWith("/admin/dashboard");

  return (
    <>
      {!hideNav && <Navbar />}
      {!hideNav && <TodayDate />}
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PageTransition>
                <LandingPage />
              </PageTransition>
            }
          />
          <Route
            path="/login"
            element={
              <PageTransition>
                <UnifiedLogin />
              </PageTransition>
            }
          />
          <Route path="/student/login" element={<Navigate to="/login" replace />} />
          <Route
            path="/student/signup"
            element={
              <PageTransition>
                <Studentsignup />
              </PageTransition>
            }
          />
          <Route path="/teacher/login" element={<Navigate to="/login" replace />} />
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />

          {/* role-based routes */}
          <Route path="/student/*" element={<StudentRoutes />} />
          <Route path="/lecturer/*" element={<LecturerRoutes />} />
          <Route path="/admin/*" element={<AdminRoutes />} />

          {/* legacy / misc */}
          <Route
            path="/student/notapproved"
            element={
              <PageTransition>
                <ApproveStudent />
              </PageTransition>
            }
          />
          <Route
            path="/spinner"
            element={
              <PageTransition>
                <Spinner />
              </PageTransition>
            }
          />
          <Route
            path="*"
            element={
              <PageTransition>
                <NotFound />
              </PageTransition>
            }
          />
        </Routes>
      </AnimatePresence>
    </>
  );
}

export default App;
