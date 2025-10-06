import React from 'react';
import './ConfirmationModal.css';

const ConfirmationModal = ({ booking, onClose, onCreateNew }) => {
    if (!booking) {
        return null;
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Booking Confirmed!</h2>
                <p>Your booking has been successfully created.</p>
                <div className="booking-details">
                    <p><strong>Booking ID:</strong> {booking.bookingId}</p>
                    {/* Add more booking details here as needed */}
                </div>
                <div className="modal-actions">
                    <button onClick={onCreateNew}>Create New Booking</button>
                    <button onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
