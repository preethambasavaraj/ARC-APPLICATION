import React from 'react';

const BookingList = ({ bookings }) => {
    return (
        <table>
            <thead>
                <tr>
                    <th>Booking ID</th>
                    <th>Court</th>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>Time Slot</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                {bookings.map(booking => (
                    <tr key={booking.id}>
                        <td>{booking.id}</td>
                        <td>{booking.court_name}</td>
                        <td>{booking.customer_name}</td>
                        <td>{booking.customer_contact}</td>
                        <td>{booking.time_slot}</td>
                        <td>{booking.status}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default BookingList;
