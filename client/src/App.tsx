import {BrowserRouter, Route, Routes} from 'react-router-dom';
import Layout from "./pages/Layout.tsx";
import './App.css';
import LoginPage from "./pages/LoginPage.tsx";
import NotFoundPage from "./pages/NotFoundPage.tsx";
import ProtectedRoute from "./routes/ProtectedRoute.tsx";
import RegisterPage from "./pages/RegisterPage.tsx";
import UserPage from "./pages/UserPage.tsx";
import SubjectsPage from "./pages/SubjectsPage.tsx";
import AddSubjectPage from "./pages/admins/AddSubjectPage.tsx";
import SubjectDetailPage from "./pages/SubjectDetailPage.tsx";
import UploadPage from "./pages/admins/UploadPage.tsx";
import StudentsPage from "./pages/StudentsPage.tsx";
import StudentDetailPage from "./pages/StudentDetailPage.tsx";
import TeachersPage from "./pages/TeachersPage.tsx";
import CamerasPage from "./pages/CamerasPage.tsx";
import CameraDetailPage from "./pages/CameraDetailPage.tsx";
import Announcements from './pages/Announcements.tsx';
import AnnouncementDetails from './pages/AnnouncementPage.tsx';

function App() {
    return (
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
                        <Route path="/students" element={<StudentsPage />} />
                        <Route path="/students/:id" element={<StudentDetailPage />} />
                        <Route path="/subjects" element={<SubjectsPage />} />
                        <Route path="subject/:id" element={<SubjectDetailPage />} />
                        <Route path="/teachers" element={<TeachersPage />} />
                        <Route path="/cameras" element={<CamerasPage />} />
                        <Route path="/cameras/:id" element={<CameraDetailPage />} />
                        <Route path="/user" element={<UserPage />} />
                    </Route>
                    <Route path="*" element={<NotFoundPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;