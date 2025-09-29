import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import ConfirmationModal from './ConfirmationModal';

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
    const [slotsBooked, setSlotsBooked] = useState(1);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [lastBooking, setLastBooking] = useState(null);

    useEffect(() => {
        // When available courts change, reset the form
        setCourtId('');
    }, [courts]);

    // Debounced effect for calculating price
    useEffect(() => {
        const calculatePrice = async () => {
            if (courtId && startTime && endTime) {
                const selectedCourt = courts.find(c => c.id === parseInt(courtId));
                if (!selectedCourt) return;

                try {
                    const res = await api.post('/bookings/calculate-price', {
                        sport_id: selectedCourt.sport_id,
                        startTime,
                        endTime,
                        slots_booked: slotsBooked
                    });
                    const newTotalPrice = res.data.total_price || 0;
                    setTotalPrice(newTotalPrice);
                    setAmountPaid(newTotalPrice); // Default to full amount paid
                    setBalance(0);
                } catch (error) {
                    console.error("Error calculating price:", error);
                    setTotalPrice(0);
                    setAmountPaid(0);
                    setBalance(0);
                }
            }
        };

        const handler = setTimeout(() => {
            calculatePrice();
        }, 300); // 300ms debounce

        return () => {
            clearTimeout(handler);
        };
    }, [courtId, startTime, endTime, courts, slotsBooked]);

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
        if (totalPrice <= 0) {
            setMessage('Cannot create a booking with zero or negative price. Please check the times.');
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
                amount_paid: amountPaid,
                slots_booked: slotsBooked
            });
            setLastBooking(res.data);
            setIsConfirmationModalOpen(true);
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
        <>
            <form onSubmit={handleSubmit}>
                {message && <p>{message}</p>}
                <p>Booking for: <strong>{selectedDate}</strong> from <strong>{startTime}</strong> to <strong>{endTime}</strong></p>
                <div>
                    <label>Court</label>
                    <select value={courtId} onChange={(e) => setCourtId(e.target.value)} required>
                        <option value="">Select an Available Court</option>
                        {courts.map(court => (
                            <option key={court.id} value={court.id}>{court.name} ({court.sport_name}) {court.available_slots ? `(${court.available_slots} slots available)` : ''}</option>
                        ))}
                    </select>
                </div>
                {courts.find(c => c.id === parseInt(courtId) && c.sport_name === 'Swimming') && (
                    <div>
                        <label>Number of People</label>
                        <input type="number" value={slotsBooked} onChange={(e) => setSlotsBooked(e.target.value)} min="1" required />
                    </div>
                )}
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
                    <label>Total Price</label>
                    <input type="number" value={totalPrice} readOnly style={{ backgroundColor: '#f0f0f0' }} />
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
                        {isConfirmationModalOpen && (
                                        <ConfirmationModal 
                                            booking={lastBooking}
                                            onClose={() => {
                                                console.log('Close button clicked');
                                                setIsConfirmationModalOpen(false);
                                            }}
                                            onCreateNew={() => {
                                                console.log('Create New Booking button clicked');
                                                setIsConfirmationModalOpen(false);
                                                // The form is already reset, so we just need to close the modal.
                                            }}
                                        />                        )}
                    </>    );
};

export default BookingForm;
