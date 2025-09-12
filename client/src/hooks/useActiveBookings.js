import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';

const getClearedIdsFromStorage = () => {
    try {
        const item = sessionStorage.getItem('clearedBookingIds');
        const ids = item ? JSON.parse(item) : [];
        return new Set(ids);
    } catch (error) {
        console.error("Error reading from sessionStorage:", error);
        return new Set();
    }
};

export const useActiveBookings = () => {
    const [activeBookings, setActiveBookings] = useState([]);
    const [clearedBookingIds, setClearedBookingIds] = useState(getClearedIdsFromStorage);

    useEffect(() => {
        try {
            sessionStorage.setItem('clearedBookingIds', JSON.stringify([...clearedBookingIds]));
        } catch (error) {
            console.error("Error writing to sessionStorage:", error);
        }
    }, [clearedBookingIds]);

    const fetchActiveBookings = useCallback(async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/bookings/active`);
            setActiveBookings(res.data);
        } catch (error) {
            console.error("Error fetching active bookings:", error);
        }
    }, []);

    useEffect(() => {
        fetchActiveBookings();
        const interval = setInterval(fetchActiveBookings, 60000); // Fetch every minute

        return () => clearInterval(interval);
    }, [fetchActiveBookings]);

    const removeBooking = useCallback((bookingId) => {
        setClearedBookingIds(prevClearedIds => {
            const newSet = new Set(prevClearedIds);
            newSet.add(bookingId);
            return newSet;
        });
    }, []);

    const visibleBookings = useMemo(() => {
        return activeBookings.filter(booking => !clearedBookingIds.has(booking.id));
    }, [activeBookings, clearedBookingIds]);

    return { bookings: visibleBookings, removeBooking };
};
