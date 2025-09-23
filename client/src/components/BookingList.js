import React from 'react';

const BookingList = ({ bookings, onEdit, onCancel, onReceipt }) => {
    const rowStyle = (booking) => {
        if (booking.status === 'Cancelled') {
            return { textDecoration: 'line-through', color: '#999' };
        }
        return {};
    };

    return (
        <div className="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Booking ID</th>
                        <th>Sport</th>
                        <th>Court</th>
                        <th>Customer</th>
                        <th>Booked-By</th>
                        <th>Contact</th>
                        <th>Time Slot</th>
                        <th>Amount Paid</th>
                        <th>Balance</th>
                        <th>Payment Status</th>
                        <th>Booking Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {bookings.map(booking => (
                        <tr key={booking.id} style={rowStyle(booking)}>
                            <td>{booking.id}</td>
                            <td>{booking.sport_name}</td>
                            <td>{booking.court_name}</td>
                            <td>{booking.customer_name}</td>
                            <td>{booking.created_by_user || 'N/A'}</td>
                            <td>{booking.customer_contact}</td>
                            <td>{booking.time_slot}</td>
                            <td>{booking.amount_paid}</td>
                            <td>{booking.balance_amount}</td>
                            <td>{booking.payment_status}</td>
                            <td>{booking.status}</td>
                            <td>
                                <button onClick={() => onReceipt(booking)}>Receipt</button>
                                {booking.status !== 'Cancelled' && (
                                    <>
                                        <button onClick={() => onEdit(booking)}>Edit Payment</button>
                                        <button onClick={() => onCancel(booking.id)}>Cancel</button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default BookingList;