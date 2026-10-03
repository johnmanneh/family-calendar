import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProviders } from './context/AppProviders';
import Login from './pages/login/Login';
import Register from './pages/register/Register';
import Dashboard from './pages/dashboard/Dashboard';
import MemberProfile from './pages/member/MemberProfile';
import GroupPage from './pages/group/GroupPage';
import PrivateRoute from './components/common/PrivateRoute';
import './App.css';


function App() {
  return (
    <AppProviders>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/profile/:userId" element={<PrivateRoute><MemberProfile /></PrivateRoute>} />
          <Route path="/group/:groupId" element={<PrivateRoute><GroupPage /></PrivateRoute>} />
        </Routes>
      </Router>
    </AppProviders>
  );
}

export default App;