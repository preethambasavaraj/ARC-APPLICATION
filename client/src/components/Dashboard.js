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

        fetchData();
        window.addEventListener('focus', fetchData);
        return () => {
            window.removeEventListener('focus', fetchData);
        };
    }, [fetchAvailability, fetchBookingsForDate]);

    const handleBookingSuccess = () => {
        fetchAvailability();
        fetchBookingsForDate();
    }

    const handleTimeSlotChange = (event) => {
        const [start, end] = event.target.value.split('-');
        setStartTime(start);
        setEndTime(end);
    }

    const timeSlots = Array.from({ length: 16 }, (_, i) => {
        const startHour = 6 + i;
        const endHour = startHour + 1;
        const startTimeValue = `${String(startHour).padStart(2, '0')}:00`;
        const endTimeValue = `${String(endHour).padStart(2, '0')}:00`;
        const timeLabel = `${startHour % 12 === 0 ? 12 : startHour % 12}:00 ${startHour < 12 ? 'AM' : 'PM'} - ${endHour % 12 === 0 ? 12 : endHour % 12}:00 ${endHour < 12 ? 'AM' : 'PM'}`;
        return { value: `${startTimeValue}-${endTimeValue}`, label: timeLabel };
    });

    return (
        <div>
            <h2>Dashboard</h2>

            <div>
                <h3>Check Availability & Book</h3>
                <label>Date: </label>
                <input type="date" value={selectedDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setSelectedDate(e.target.value)} />
                
                <div>
                    <label>Time Slot: </label>
                    <select onChange={handleTimeSlotChange} value={`${startTime}-${endTime}`}>
                        {timeSlots.map(slot => (
                            <option key={slot.value} value={slot.value}>
                                {slot.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ marginTop: '10px' }}>
                    <label>Start Time: </label>
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                    <label>End Time: </label>
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
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
