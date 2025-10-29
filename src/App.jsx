import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedLayout from './components/ProtectedLayout.jsx';
import AuthPage from './pages/Auth.jsx';
import DashboardPage from './pages/Dashboard.jsx';
import FlashcardsPage from './pages/Flashcards.jsx';
import FlashcardBuilderPage from './pages/FlashcardBuilder.jsx';
import FlashcardDetailPage from './pages/FlashcardDetail.jsx';
import AiFlashcardsPage from './pages/AiFlashcards.jsx';
import QuizBuilderPage from './pages/QuizBuilder.jsx';
import QuizPlayerPage from './pages/QuizPlayer.jsx';
import LearningMaterialsPage from './pages/LearningMaterials.jsx';
import AdminPage from './pages/Admin.jsx';
import LearningMaterialsPage from './pages/LearningMaterials.jsx';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />

          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/flashcards" element={<FlashcardsPage />} />
            <Route path="/flashcards/new" element={<FlashcardBuilderPage />} />
            <Route path="/flashcards/:id" element={<FlashcardDetailPage />} />

            <Route path="/ai-flashcards" element={<AiFlashcardsPage />} />

            <Route path="/quizzes" element={<QuizBuilderPage />} />
            <Route path="/quizzes/:id/play" element={<QuizPlayerPage />} />
            <Route path="/materials" element={<LearningMaterialsPage />} />

            <Route path="/admin" element={<AdminPage />} />

            <Route path="/materials" element={<LearningMaterialsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
