import React, { useState, useEffect } from 'react';
import api from '../api';

const BookingForm = ({ courts, selectedDate, startTime, endTime, onBookingSuccess, user }) => {
    const [courtId, setCourtId] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerContact, setCustomerContact] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [paymentMode, setPaymentMode] = useState('cash');
    const [amountPaid, setAmountPaid] = useState(0);
    const [totalPrice, setTotalPrice] = useState(0);
    const [balance, setBalance] = useState(0);
    const [message, setMessage] = useState('');

    useEffect(() => {
        // When available courts change, reset the form
        setCourtId('');
        setAmountPaid(0);
        setTotalPrice(0);
        setBalance(0);
    }, [courts]);

    useEffect(() => {
        // When a court is selected, auto-fill the price and calculate balance
        if (courtId) {
            const selectedCourt = courts.find(c => c.id === parseInt(courtId));
            if (selectedCourt) {
                const price = selectedCourt.price || 0;
                setTotalPrice(price);
                setAmountPaid(price); // Default to full amount paid
                setBalance(0);
            }
        } else {
            setTotalPrice(0);
            setAmountPaid(0);
            setBalance(0);
        }
    }, [courtId, courts]);

    const handleAmountPaidChange = (e) => {
        const newAmountPaid = parseFloat(e.target.value) || 0;
        setAmountPaid(newAmountPaid);
        setBalance(totalPrice - newAmountPaid);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!courtId) {
            setMessage('Please select a court.');
            return;
        }
        try {
            const res = await api.post('/bookings', {
                court_id: courtId,
                customer_name: customerName,
                customer_contact: customerContact,
                customer_email: customerEmail,
                date: selectedDate,
                startTime: startTime,
                endTime: endTime,
                payment_mode: paymentMode,
                amount_paid: amountPaid
            });
            setMessage(`Booking successful! Receipt ID: ${res.data.bookingId}.`);
            // Reset form
            setCustomerName('');
            setCustomerContact('');
            setCustomerEmail('');
            setPaymentMode('cash');
            setAmountPaid(0);
            setTotalPrice(0);
            setBalance(0);
            setCourtId('');
            onBookingSuccess();
        } catch (err) {
            setMessage(err.response?.data?.message || 'Error creating booking');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {message && <p>{message}</p>}
            <p>Booking for: <strong>{selectedDate}</strong> from <strong>{startTime}</strong> to <strong>{endTime}</strong></p>
            <div>
                <label>Court</label>
                <select value={courtId} onChange={(e) => setCourtId(e.target.value)} required>
                    <option value="">Select an Available Court</option>
                    {courts.map(court => (
                        <option key={court.id} value={court.id}>{court.name} ({court.sport_name}) - ₹{court.price}</option>
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
            <div>
                <label>Customer Email (Optional)</label>
                <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
            </div>
            <div>
                <label>Payment Mode</label>
                <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} required>
                    <option value="cash">Cash</option>
                    <option value="online">Online</option>
                </select>
            </div>
            <div>
                <label>Amount Paid</label>
                <input type="number" value={amountPaid} onChange={handleAmountPaidChange} required />
            </div>
            <div>
                <label>Balance</label>
                <input type="number" value={balance} readOnly style={{ backgroundColor: '#f0f0f0' }} />
            </div>
            <button type="submit">Create Booking</button>
        </form>
    );
};

export default BookingForm;
