import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BookingList from './BookingList';

const Ledger = () => {
    const [bookings, setBookings] = useState([]);
    const [filteredBookings, setFilteredBookings] = useState([]);
    const [filters, setFilters] = useState({ date: '', sport: '', customer: '' });

    useEffect(() => {
        const fetchAllBookings = async () => {
            const res = await axios.get('http://localhost:5000/api/bookings/all');
            setBookings(res.data);
            setFilteredBookings(res.data);
        };
        fetchAllBookings();
    }, []);

    useEffect(() => {
        let filtered = bookings;
        if (filters.date) {
            filtered = filtered.filter(b => b.date.startsWith(filters.date));
        }
        // Add more filtering logic for sport and customer if needed
        setFilteredBookings(filtered);
    }, [filters, bookings]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    }

    return (
        <div>
            <h2>Booking Ledger</h2>
            <div>
                <input type="date" name="date" value={filters.date} onChange={handleFilterChange} />
                 {/* Add more filters for sport and customer here */}
            </div>
            <BookingList bookings={filteredBookings} />
        </div>
    );
};

export default Ledger;
