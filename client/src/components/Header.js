import React from 'react';
import { Link } from 'react-router-dom';

const Header = ({ user, onLogout }) => {
    return (
        <header>
            <h1>SportsZone Booking</h1>
            <nav>
                {user && (
                    <>
                        <Link to="/">Dashboard</Link>
                        <Link to="/ledger">Ledger</Link>
                        <Link to="/admin">Admin</Link>
                        <button onClick={onLogout}>Logout</button>
                    </>
                )}
            </nav>
        </header>
    );
};

export default Header;
