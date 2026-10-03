import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProviders } from './context/AppProviders';
import Login from './pages/login/Login';
import Register from './pages/register/Register';
import Dashboard from './pages/dashboard/Dashboard';
import MemberProfile from './pages/member/MemberProfile';
import GroupPage from './pages/group/GroupPage';
import './App.css';


function App() {
  return (
    <AppProviders>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile/:userId" element={<MemberProfile />} />
          <Route path="/group/:groupId" element={<GroupPage />} />
        </Routes>
      </Router>
    </AppProviders>
  );
}

export default App;