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
    const [allBookings, setAllBookings] = useState([]);
    const [clearedBookingIds, setClearedBookingIds] = useState(getClearedIdsFromStorage);

    useEffect(() => {
        try {
            localStorage.setItem('clearedBookingIds', JSON.stringify([...clearedBookingIds]));
        } catch (error) {
            console.error("Error writing to localStorage:", error);
        }
    }, [clearedBookingIds]);

    const fetchAllBookings = useCallback(async () => {
        try {
            const res = await api.get(`/bookings/all`);
            setAllBookings(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error fetching all bookings:", error);
            setAllBookings([]);
        }
    }, []);

    useEffect(() => {
        fetchAllBookings();
        const interval = setInterval(fetchAllBookings, 60000); // Fetch every minute

        return () => clearInterval(interval);
    }, [fetchAllBookings]);

    const removeBooking = useCallback((bookingId) => {
        setClearedBookingIds(prevClearedIds => {
            const newSet = new Set(prevClearedIds);
            newSet.add(bookingId);
            return newSet;
        });
    }, []);

    const markAsCompletedAndClear = useCallback(async (booking) => {
        try {
            // Step 1: Update the backend
            await api.put(`/bookings/${booking.id}/payment`, {
                amount_paid: booking.total_price, // Assume full payment is made
                payment_status: 'Completed'
            });
            // Step 2: Clear from the UI
            removeBooking(booking.id);
            // Optional: Force a refetch to ensure all data is fresh
            fetchAllBookings();
        } catch (error) {
            console.error("Error marking booking as completed:", error);
            // Optionally, show an error to the user
        }
    }, [removeBooking, fetchAllBookings]);

    const categorizedBookings = useMemo(() => {
        if (!Array.isArray(allBookings)) {
            return { inProgress: [], upcoming: [] };
        }

        const now = new Date();
        const today = now.toISOString().slice(0, 10);

        const inProgress = [];
        const upcoming = [];

        const visibleBookings = allBookings.filter(booking => !clearedBookingIds.has(booking.id) && booking.status !== 'Cancelled');

        for (const booking of visibleBookings) {
            const bookingDate = booking.date.slice(0, 10);

            const parseTime = (timeStr) => {
                const [time, modifier] = timeStr.split(' ');
                let [hours, minutes] = time.split(':').map(Number);
                if (modifier === 'PM' && hours < 12) hours += 12;
                if (modifier === 'AM' && hours === 12) hours = 0;
                const date = new Date(booking.date);
                date.setHours(hours, minutes, 0, 0);
                return date;
            };

            const [startTimeStr, endTimeStr] = booking.time_slot.split(' - ');
            const startTime = parseTime(startTimeStr);
            const endTime = parseTime(endTimeStr);

            if (bookingDate === today) {
                let status = 'upcoming';
                if (now >= startTime && now <= endTime) {
                    status = 'active';
                } else if (now > endTime) {
                    status = 'ended';
                }

                if (status === 'active' || status === 'ended') {
                    inProgress.push({ ...booking, status, startTime, endTime });
                } else {
                    upcoming.push({ ...booking, status, startTime, endTime });
                }
            } else if (new Date(bookingDate) > new Date(today)) {
                upcoming.push({ ...booking, status: 'upcoming', startTime, endTime });
            }
        }

        // Sort upcoming by start time
        upcoming.sort((a, b) => a.startTime - b.startTime);

        return { inProgress, upcoming };

    }, [allBookings, clearedBookingIds]);

    return { ...categorizedBookings, removeBooking, markAsCompletedAndClear };
};
