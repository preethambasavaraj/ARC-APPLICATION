import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api';

const getClearedIdsFromStorage = () => {
    try {
        const item = localStorage.getItem('clearedBookingIds');
        const ids = item ? JSON.parse(item) : [];
        return new Set(ids);
    } catch (error) {
        console.error("Error reading from localStorage:", error);
        return new Set();
    }
};

export const useActiveBookings = () => {
    const [activeBookings, setActiveBookings] = useState([]);
    const [clearedBookingIds, setClearedBookingIds] = useState(getClearedIdsFromStorage);

    useEffect(() => {
        try {
            localStorage.setItem('clearedBookingIds', JSON.stringify([...clearedBookingIds]));
        } catch (error) {
            console.error("Error writing to localStorage:", error);
        }
    }, [clearedBookingIds]);

    const fetchActiveBookings = useCallback(async () => {
        try {
            const res = await api.get(`/bookings/active`);
            setActiveBookings(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error fetching active bookings:", error);
            setActiveBookings([]);
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
        if (!Array.isArray(activeBookings)) {
            return [];
        }
        return activeBookings.filter(booking => !clearedBookingIds.has(booking.id));
    }, [activeBookings, clearedBookingIds]);

    return { bookings: visibleBookings, removeBooking };
};
