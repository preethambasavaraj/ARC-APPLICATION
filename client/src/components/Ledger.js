import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import BookingList from './BookingList';
import EditBookingModal from './EditBookingModal';

const Ledger = () => {
    const [bookings, setBookings] = useState([]);
    const [filters, setFilters] = useState({ date: '', sport: '', customer: '' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);

    const fetchFilteredBookings = useCallback(async () => {
        const { date, sport, customer } = filters;
        try {
            const res = await api.get('/bookings/all', {
                params: { date, sport, customer }
            });
            setBookings(res.data);
        } catch (error) {
            console.error("Error fetching bookings:", error);
        }
    }, [filters]);

    useEffect(() => {
        fetchFilteredBookings();
    }, [fetchFilteredBookings]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    }

    const handleEditClick = (booking) => {
        setSelectedBooking(booking);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedBooking(null);
    };

    const handleSavePayment = async (bookingId, paymentData) => {
        try {
            await api.put(`/bookings/${bookingId}/payment`, paymentData);
            handleCloseModal();
            fetchFilteredBookings(); // Refresh data
        } catch (error) {
            console.error("Error updating payment:", error);
        }
    };

    const handleCancelClick = async (bookingId) => {
        if (window.confirm('Are you sure you want to cancel this booking?')) {
            try {
                await api.put(`/bookings/${bookingId}/cancel`);
                fetchFilteredBookings(); // Refresh data
            } catch (error) {
                console.error("Error cancelling booking:", error);
            }
        }
    };

    return (
        <div>
            <h2>Booking Ledger</h2>
            <div>
                <input type="date" name="date" value={filters.date} onChange={handleFilterChange} />
                <input type="text" name="sport" placeholder="Filter by sport" value={filters.sport} onChange={handleFilterChange} />
                <input type="text" name="customer" placeholder="Filter by customer" value={filters.customer} onChange={handleFilterChange} />
            </div>
            <BookingList 
                bookings={bookings} 
                onEdit={handleEditClick} 
                onCancel={handleCancelClick} 
            />
            {isModalOpen && (
                <EditBookingModal 
                    booking={selectedBooking}
                    onSave={handleSavePayment}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
};

export default Ledger;
