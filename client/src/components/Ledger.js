import React, { useState, useEffect } from 'react';
import api from '../api';
import BookingList from './BookingList';

const Ledger = () => {
    const [bookings, setBookings] = useState([]);
    const [filters, setFilters] = useState({ date: '', sport: '', customer: '' });

    useEffect(() => {
        const fetchFilteredBookings = async () => {
            const { date, sport, customer } = filters;
            const res = await api.get('/bookings/all', {
                params: { date, sport, customer }
            });
            setBookings(res.data);
        };
        fetchFilteredBookings();
    }, [filters]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    }

    return (
        <div>
            <h2>Booking Ledger</h2>
            <div>
                <input type="date" name="date" value={filters.date} onChange={handleFilterChange} />
                <input type="text" name="sport" placeholder="Filter by sport" value={filters.sport} onChange={handleFilterChange} />
                <input type="text" name="customer" placeholder="Filter by customer" value={filters.customer} onChange={handleFilterChange} />
            </div>
            <BookingList bookings={bookings} />
        </div>
    );
};

export default Ledger;
