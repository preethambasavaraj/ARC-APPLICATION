import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Ledger from './components/Ledger';
import Admin from './components/Admin';
import './App.css';

const ProtectedRoute = ({ user, allowedRoles, children }) => {
    if (!user) {
        return <Navigate to="/login" />;
    }

    if (!allowedRoles.includes(user.role)) {
        return <Navigate to="/" />;
    }

    return children;
};

function App() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const loggedInUser = localStorage.getItem('user');
        if (loggedInUser) {
            setUser(JSON.parse(loggedInUser));
        }
    }, []);

    const handleLogin = (loggedInUser) => {
        localStorage.setItem('user', JSON.stringify(loggedInUser));
        setUser(loggedInUser);
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <Router>
            <div className="App">
                <Header user={user} onLogout={handleLogout} />
                <main>
                    <Routes>
                        <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
                        <Route path="/" element={
                            <ProtectedRoute user={user} allowedRoles={['admin', 'desk', 'staff']}>
                                <Dashboard user={user} />
                            </ProtectedRoute>
                        } />
                        <Route path="/ledger" element={
                            <ProtectedRoute user={user} allowedRoles={['admin', 'desk', 'staff']}>
                                <Ledger user={user} />
                            </ProtectedRoute>
                        } />
                        <Route path="/admin" element={
                            <ProtectedRoute user={user} allowedRoles={['admin']}>
                                <Admin user={user} />
                            </ProtectedRoute>
                        } />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;