import React, { useState, useEffect } from 'react';

const EditBookingModal = ({ booking, onSave, onClose }) => {
    const [amountPaid, setAmountPaid] = useState(0);
    const [paymentStatus, setPaymentStatus] = useState('Pending');

    useEffect(() => {
        if (booking) {
            setAmountPaid(booking.amount_paid || 0);
            setPaymentStatus(booking.payment_status || 'Pending');
        }
    }, [booking]);

    if (!booking) {
        return null;
    }

    const handleManualSave = () => {
        onSave(booking.id, { amount_paid: amountPaid, payment_status: paymentStatus });
    };

    const handleSaveAsPaid = () => {
        onSave(booking.id, { amount_paid: booking.total_amount, payment_status: 'Completed' });
    };

    const modalStyle = {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'white',
        padding: '20px',
        zIndex: 1000,
        border: '1px solid #ccc',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    };

    const overlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 999
    };

    return (
        <>
            <div style={overlayStyle} onClick={onClose} />
            <div style={modalStyle}>
                <h3>Edit Payment for Booking #{booking.id}</h3>
                <p><strong>Total Amount:</strong> ₹{booking.total_amount}</p>
                <div>
                    <label>Amount Paid: </label>
                    <input 
                        type="number" 
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                    />
                </div>
                <div style={{ margin: '10px 0' }}>
                    <label>Payment Status: </label>
                    <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                        <option value="Pending">Pending</option>
                        <option value="Received">Received</option>
                        <option value="Completed">Completed</option>
                    </select>
                </div>
                <div style={{ marginTop: '20px' }}>
                    <button onClick={handleManualSave}>Save Changes</button>
                    <button onClick={handleSaveAsPaid} style={{ marginLeft: '10px' }}>Mark as Fully Paid & Save</button>
                    <button onClick={onClose} style={{ marginLeft: '10px' }}>Cancel</button>
                </div>
            </div>
        </>
    );
};

export default EditBookingModal;