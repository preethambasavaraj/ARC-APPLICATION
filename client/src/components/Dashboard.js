import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import BookingForm from './BookingForm';
import BookingList from './BookingList';

const Dashboard = ({ user }) => {
    const [bookings, setBookings] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [availability, setAvailability] = useState([]);

    const fetchAvailability = useCallback(async () => {
        if (selectedDate && startTime && endTime) {
            try {
                console.log('Fetching availability with params:', { date: selectedDate, startTime: startTime, endTime: endTime });
                const res = await axios.get(`http://localhost:5000/api/courts/availability`, { 
                    params: { 
                        date: selectedDate, 
                        startTime: startTime, 
                        endTime: endTime 
                    } 
                });
                setAvailability(res.data);
            } catch (error) {
                console.error("Error fetching availability:", error);
            }
        }
    }, [selectedDate, startTime, endTime]);

    const fetchBookingsForDate = useCallback(async () => {
        const res = await axios.get(`http://localhost:5000/api/bookings?date=${selectedDate}`);
        setBookings(res.data);
    }, [selectedDate]);

    useEffect(() => {
        const fetchData = () => {
            fetchAvailability();
            fetchBookingsForDate();
        };

        fetchData(); // Initial fetch

        // Refetch when the window gets focus
        window.addEventListener('focus', fetchData);
        return () => {
            window.removeEventListener('focus', fetchData);
        };
    }, [fetchAvailability, fetchBookingsForDate]);

    const handleBookingSuccess = () => {
        fetchAvailability();
        fetchBookingsForDate();
    }

    return (
        <div>
            <h2>Dashboard</h2>

            <div>
                <h3>Check Availability & Book</h3>
                <label>Date: </label>
                <input type="date" value={selectedDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setSelectedDate(e.target.value)} />
                <label>Start Time: </label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                <label>End Time: </label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                <div style={{ flex: 1 }}>
                    <h4>Court Status at Selected Time</h4>
                    <table>
                        <thead>
                            <tr>
                                <th>Court</th>
                                <th>Sport</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {availability.map(court => (
                                <tr key={court.id}>
                                    <td>{court.name}</td>
                                    <td>{court.sport_name}</td>
                                    <td style={{ color: court.is_available ? 'green' : 'red' }}>
                                        {court.status === 'Under Maintenance' ? 'Maintenance' : court.is_available ? 'Available' : 'Engaged'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div style={{ flex: 1 }}>
                     <h4>Book a Slot</h4>
                     <BookingForm
                        courts={availability.filter(c => c.is_available)}
                        selectedDate={selectedDate}
                        startTime={startTime}
                        endTime={endTime}
                        onBookingSuccess={handleBookingSuccess}
                        user={user}
                    />
                </div>
            </div>

            <div style={{marginTop: '20px'}}>
                <h3>Bookings for {selectedDate}</h3>
                <BookingList bookings={bookings} />
            </div>
        </div>
    );
};

export default Dashboard;
