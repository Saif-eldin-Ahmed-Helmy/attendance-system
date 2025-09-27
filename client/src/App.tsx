import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import Layout from "./pages/Layout";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import RegisterPage from "./pages/RegisterPage";
import UserPage from "./pages/UserPage";
import SubjectsPage from "./pages/SubjectsPage";
import AddSubjectPage from "./pages/admins/AddSubjectPage";
import SubjectDetailPage from "./pages/SubjectDetailPage";
import UploadPage from "./pages/admins/UploadPage";
import StudentsPage from "./pages/StudentsPage";
import StudentDetailPage from "./pages/StudentDetailPage";
import TeachersPage from "./pages/TeachersPage";
import CamerasPage from "./pages/CamerasPage";
import CameraDetailPage from "./pages/CameraDetailPage";
import Announcements from './pages/Announcements';
import AnnouncementDetails from './pages/AnnouncementPage';
import Materials from './pages/Materials';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route element={<ProtectedRoute navigateTo="/subjects" isAuth={false}/>}>
                <Route index element={<LoginPage />} />
              </Route>
              <Route element={<ProtectedRoute navigateTo="/user" isAuth={false}/>}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>
              <Route element={<ProtectedRoute role='management'/>}>
                <Route path="/admin/add-subject" element={<AddSubjectPage />} />
                <Route path="/admin/upload" element={<UploadPage />} />
              </Route>
              <Route element={<ProtectedRoute navigateTo="/login"/>}>
                <Route path="/announcements" element={<Announcements/>} />
                <Route path="/announcement/:id" element={<AnnouncementDetails />} />
                <Route path="/materials" element={<Materials />} />
                <Route path="/students" element={<StudentsPage />} />
                <Route path="/students/:id" element={<StudentDetailPage />} />
                <Route path="/subjects" element={<SubjectsPage />} />
                <Route path="/subject/:id" element={<SubjectDetailPage />} />
                <Route path="/teachers" element={<TeachersPage />} />
                <Route path="/cameras" element={<CamerasPage />} />
                <Route path="/cameras/:id" element={<CameraDetailPage />} />
                <Route path="/user" element={<UserPage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;