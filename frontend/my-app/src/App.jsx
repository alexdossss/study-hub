import React from "react";
import { Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import HomePublic from "./pages/HomePublic";
import OwnNotes from "./pages/private/OwnNotes";
import PublicNotes from "./pages/public/PublicNotes";
import ViewNote from './pages/ViewNote';
import BookmarkedNotes from './pages/private/BookmarkedNotes';
import StudyPlanner from "./pages/private/StudyPlanner";
import Flashcards from "./pages/private/Flashcards";
import FlashcardDeckView from "./pages/private/FlashcardDeckView";
import MyQuizzes from "./pages/private/MyQuizzes";
import TakeQuiz from './pages/private/TakeQuiz';

// Protected Route wrapper component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem("userInfo");
  return isAuthenticated ? children : <Navigate to="/" />;
};

function App() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <div>
      {isLandingPage && (
        <div style={{
          textAlign: 'center',
          padding: '50px',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>StudyHub</h1>
          <p style={{ fontSize: '1.2rem', marginBottom: '30px' }}>Your personal study companion.</p>

          <div style={{ display: 'flex', gap: '20px' }}>
            <Link to="/login" style={{
              padding: '10px 30px',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '5px'
            }}>
              Login
            </Link>
            <Link to="/signup" style={{
              padding: '10px 30px',
              backgroundColor: '#28a745',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '5px'
            }}>
              Sign Up
            </Link>
          </div>
        </div>
      )}

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/home" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/home-public" element={
          <ProtectedRoute>
            <HomePublic />
          </ProtectedRoute>
        } />
        <Route path="/notes" element={
          <ProtectedRoute>
            <OwnNotes />
          </ProtectedRoute>
        } />
        <Route path="/public-notes" element={
          <ProtectedRoute>
            <PublicNotes />
          </ProtectedRoute>
        } />
        <Route path="/notes/:id" element={
          <ProtectedRoute>
            <ViewNote />
          </ProtectedRoute>
        } />
        <Route path="/bookmarks" element={
          <ProtectedRoute>
            <BookmarkedNotes />
          </ProtectedRoute>
        } />
        <Route path="/study-planner" element={
          <ProtectedRoute>
            <StudyPlanner />
          </ProtectedRoute>
        } />

        {/* Flashcards routes (protected) */}
        <Route path="/flashcards" element={
          <ProtectedRoute>
            <Flashcards />
          </ProtectedRoute>
        } />
        <Route path="/flashcards/deck/:deckId" element={
          <ProtectedRoute>
            <FlashcardDeckView />
          </ProtectedRoute>
        } />

        {/* My Quizzes route (protected) */}
        <Route path="/my-quizzes" element={
          <ProtectedRoute>
            <MyQuizzes />
          </ProtectedRoute>
        } />

        <Route path="/quizzes/take/:id" element={<TakeQuiz />} />

        <Route path="/" element={null} />
      </Routes>
    </div>
  );
}

export default App;
