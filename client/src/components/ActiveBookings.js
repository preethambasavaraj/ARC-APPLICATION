import React from 'react';
import './ActiveBookings.css';

const ActiveBookings = ({ bookings, onRemoveBooking }) => {
    return (
        <div className="active-bookings-container">
            <h4>Active Bookings</h4>
            {bookings.length === 0 ? (
                <p>No active bookings at the moment.</p>
            ) : (
                <div className="active-bookings-list">
                    {bookings.map(booking => (
                        <div key={booking.id} className={`active-booking-card ${booking.status}`}>
                            <div className="booking-info">
                                <span className="sport-name">{booking.sport_name}</span>
                                <span className="court-name">{booking.court_name}</span>
                            </div>
                            <div className="booking-time">{booking.time_slot}</div>
                            {booking.status === 'ended' && (
                                <div className="ended-message">
                                    Time has ended, inform customer.
                                    <button onClick={() => onRemoveBooking(booking.id)} className="clear-btn">
                                        Clear
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ActiveBookings;
