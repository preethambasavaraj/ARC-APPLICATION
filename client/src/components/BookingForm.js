import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BookingForm = ({ courts, selectedDate, selectedTime, onBookingSuccess, timeSlots }) => {
    const [courtId, setCourtId] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerContact, setCustomerContact] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Reset court selection when available courts change
        setCourtId('');
    }, [courts]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!courtId) {
            setMessage('Please select a court.');
            return;
        }
        try {
            const res = await axios.post('http://localhost:5000/api/bookings', {
                court_id: courtId,
                customer_name: customerName,
                customer_contact: customerContact,
                date: selectedDate,
                time_slot: selectedTime
            });
            setMessage(`Booking successful! Receipt ID: ${res.data.bookingId}. You can print this page.`);
            setCustomerName('');
            setCustomerContact('');
            setCourtId('');
            onBookingSuccess();
        } catch (err) {
            setMessage(err.response?.data?.message || 'Error creating booking');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {message && <p>{message}</p>}
            <p>Booking for: <strong>{selectedDate}</strong> at <strong>{selectedTime}</strong></p>
            <div>
                <label>Court</label>
                <select value={courtId} onChange={(e) => setCourtId(e.target.value)} required>
                    <option value="">Select an Available Court</option>
                    {courts.map(court => (
                        <option key={court.id} value={court.id}>{court.name} ({court.sport_name})</option>
                    ))}
                </select>
            </div>
            <div>
                <label>Customer Name</label>
                <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            </div>
            <div>
                <label>Customer Contact</label>
                <input type="text" value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} required />
            </div>
            <button type="submit">Create Booking</button>
        </form>
    );
};

export default BookingForm;