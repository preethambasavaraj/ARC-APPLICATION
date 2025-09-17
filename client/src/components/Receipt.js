import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import QRCode from 'react-qr-code';
import './Receipt.css';

const Receipt = () => {
    const { bookingId } = useParams();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [receiptUrl, setReceiptUrl] = useState('');

    useEffect(() => {
        setReceiptUrl(window.location.href);
        const fetchBooking = async () => {
            try {
                const response = await api.get(`/booking/${bookingId}`);
                setBooking(response.data);
            } catch (err) {
                setError('Failed to fetch booking details.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchBooking();
    }, [bookingId]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return <div>Loading receipt...</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    if (!booking) {
        return <div>Booking not found.</div>;
    }

    return (
        <div className="receipt-container">
            <div className="receipt-header">
                <h1>Booking Receipt</h1>
                <p>ARC SportsZone</p>
            </div>
            <div className="receipt-body">
                <div className="receipt-section">
                    <h2>Booking ID: {booking.booking_id}</h2>
                    <p><strong>Customer:</strong> {booking.customer_name}</p>
                    <p><strong>Contact:</strong> {booking.customer_contact}</p>
                </div>
                <div className="receipt-section">
                    <h3>Booking Details</h3>
                    <p><strong>Sport:</strong> {booking.sport_name}</p>
                    <p><strong>Court:</strong> {booking.court_name}</p>
                    <p><strong>Date:</strong> {new Date(booking.date).toLocaleDateString()}</p>
                    <p><strong>Time:</strong> {booking.time_slot}</p>
                </div>
                <div className="receipt-section">
                    <h3>Payment Details</h3>
                    <p><strong>Total Amount:</strong> ₹{booking.total_amount}</p>
                    <p><strong>Amount Paid:</strong> ₹{booking.amount_paid}</p>
                    <p><strong>Balance:</strong> ₹{booking.balance_amount}</p>
                    <p><strong>Payment Status:</strong> <span className={`status ${booking.payment_status}`}>{booking.payment_status}</span></p>
                </div>
                <div className="receipt-footer">
                    <div className="qr-code">
                        <div style={{ height: "auto", margin: "0 auto", maxWidth: 128, width: "100%" }}>
                            <QRCode
                                size={256}
                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                value={receiptUrl}
                                viewBox={`0 0 256 256`}
                            />
                        </div>
                        <p>Scan to view on your device</p>
                    </div>
                    <div className="booking-info">
                        <p><strong>Booked By:</strong> {booking.created_by || 'N/A'}</p>
                        <p><strong>Booking Status:</strong> <span className={`status ${booking.booking_status}`}>{booking.booking_status}</span></p>
                    </div>
                </div>
            </div>
            <div className="receipt-actions">
                <button onClick={handlePrint}>Print / Save as PDF</button>
            </div>
        </div>
    );
};

export default Receipt;
