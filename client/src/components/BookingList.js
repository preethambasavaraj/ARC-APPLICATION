import React, { useState } from 'react';

const BookingList = ({ bookings, onEdit, onCancel, onReceipt }) => {
    const [activeDropdown, setActiveDropdown] = useState(null);

    const rowStyle = (booking) => {
        if (booking.status === 'Cancelled') {
            return { textDecoration: 'line-through', color: '#999' };
        }
        return {};
    };

    const toggleDropdown = (bookingId) => {
        setActiveDropdown(activeDropdown === bookingId ? null : bookingId);
    };

    return (
        <>
            <style>{`
                .actions-cell {
                    position: relative;
                }
                .actions-dropdown {
                    position: absolute;
                    right: 0;
                    top: 100%;
                    background-color: white;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.15);
                    z-index: 10;
                    min-width: 120px;
                }
                .actions-dropdown button {
                    display: block;
                    width: 100%;
                    padding: 8px 12px;
                    text-align: left;
                    border: none;
                    background: none;
                    cursor: pointer;
                }
                .actions-dropdown button:hover {
                    background-color: #f5f5f5;
                }
            `}</style>
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
                                <td className="actions-cell">
                                    <button onClick={() => toggleDropdown(booking.id)}>Actions</button>
                                    {activeDropdown === booking.id && (
                                        <div className="actions-dropdown">
                                            <button onClick={() => { onReceipt(booking); toggleDropdown(booking.id); }}>View Receipt</button>
                                            {booking.status !== 'Cancelled' && (
                                                <>
                                                    <button onClick={() => { onEdit(booking); toggleDropdown(booking.id); }}>Edit Payment</button>
                                                    <button onClick={() => { onCancel(booking.id); toggleDropdown(booking.id); }}>Cancel</button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default BookingList;