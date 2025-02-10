import React from 'react';
import { Routes, Route } from 'react-router-dom';
import styled from '@emotion/styled';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ProjectSubmission from './pages/ProjectSubmission';
import ProjectDetails from './pages/ProjectDetails';
import Dashboard from './pages/Dashboard';
import Messages from './pages/Messages';
import PrivateRoute from './components/PrivateRoute';
import { useAuth } from './contexts/AuthContext';

const AppContainer = styled.div`
  min-height: 100vh;
  background-color: #f8f9fa;
`;

const MainContent = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

function App() {
  const { loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AppContainer>
      <Navbar />
      <MainContent>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/submit-project"
            element={
              <PrivateRoute>
                <ProjectSubmission />
              </PrivateRoute>
            }
          />
          <Route path="/project/:id" element={<ProjectDetails />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <PrivateRoute>
                <Messages />
              </PrivateRoute>
            }
          />
        </Routes>
      </MainContent>
    </AppContainer>
  );
}

export default App;
