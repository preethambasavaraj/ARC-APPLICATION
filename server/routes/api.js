const express = require('express');
const router = express.Router();
const db = require('../database');
const twilio = require('twilio');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');

const saltRounds = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret_key'; // Use environment variable for secret

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = new twilio(accountSid, authToken);

const userSessions = {};

// Middleware to authenticate JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401); // if there isn't any token

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};


// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);

        if (match) {
            // Create JWT
            const tokenPayload = { id: user.id, username: user.username, role: user.role };
            const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });
            res.json({ success: true, token: token, user: tokenPayload });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new user (Admin only)
router.post('/admin/users', authenticateToken, isAdmin, async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ message: 'Username, password, and role are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const [result] = await db.query(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hashedPassword, role]
        );
        res.status(201).json({ success: true, userId: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Username already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});


// Get all sports
router.get('/sports', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM sports');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all courts
router.get('/courts', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT c.id, c.name, c.status, s.name as sport_name, s.price FROM courts c JOIN sports s ON c.sport_id = s.id');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get court availability for a specific date and time
router.get('/courts/availability', authenticateToken, async (req, res) => {
    const { date, startTime, endTime } = req.query;
    if (!date || !startTime || !endTime) {
        return res.status(400).json({
            message: 'SERVER CODE IS UPDATED. Params are still missing.',
            received_query: req.query
        });
    }

    try {
        const [courts] = await db.query('SELECT c.id, c.name, c.status, c.sport_id, s.name as sport_name, s.price, s.capacity FROM courts c JOIN sports s ON c.sport_id = s.id');
        const [bookings] = await db.query('SELECT court_id, time_slot, slots_booked FROM bookings WHERE date = ?', [date]);

        const toMinutes = (timeStr) => {
            const [time, modifier] = timeStr.split(' ');
            let [hours, minutes] = time.split(':').map(Number);

            if (modifier === 'PM' && hours < 12) {
                hours += 12;
            }
            if (modifier === 'AM' && hours === 12) { // Handle midnight case
                hours = 0;
            }
            // If there's no modifier, it's already 24-hour format
            return hours * 60 + minutes;
        };

        const checkOverlap = (startA, endA, startB, endB) => {
            const startAMin = toMinutes(startA);
            const endAMin = toMinutes(endA);
            const startBMin = toMinutes(startB);
            const endBMin = toMinutes(endB);

            return startAMin < endBMin && endAMin > startBMin;
        };

        const availability = courts.map(court => {
            if (court.status === 'Under Maintenance') {
                return { ...court, is_available: false };
            }

            const courtBookings = bookings.filter(b => b.court_id === court.id);

            if (court.capacity > 1) {
                const isOverlapping = courtBookings.some(booking => {
                    const [existingStart, existingEnd] = booking.time_slot.split(' - ');
                    return checkOverlap(startTime, endTime, existingStart.trim(), existingEnd.trim());
                });

                if(isOverlapping) {
                    const slotsBooked = courtBookings.reduce((total, booking) => total + booking.slots_booked, 0);
                    const availableSlots = court.capacity - slotsBooked;
                    return { ...court, is_available: availableSlots > 0, available_slots: availableSlots };
                } else {
                    return { ...court, is_available: true, available_slots: court.capacity };
                }

            } else {
                const isOverlapping = courtBookings.some(booking => {
                    const [existingStart, existingEnd] = booking.time_slot.split(' - ');
                    return checkOverlap(startTime, endTime, existingStart.trim(), existingEnd.trim());
                });
    
                return { ...court, is_available: !isOverlapping };
            }
        });

        res.json(availability);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get bookings for a specific date
router.get('/bookings', authenticateToken, async (req, res) => {
    const { date } = req.query;
    try {
        const query = `
            SELECT 
                b.*, 
                c.name as court_name, 
                s.name as sport_name, 
                u.username as created_by_user 
            FROM bookings b 
            JOIN courts c ON b.court_id = c.id
            JOIN sports s ON b.sport_id = s.id
            LEFT JOIN users u ON b.created_by_user_id = u.id
            WHERE b.date = ?
        `;
        const [rows] = await db.query(query, [date]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all bookings (ledger)
router.get('/bookings/all', authenticateToken, async (req, res) => {
    try {
        let { date, sport, customer } = req.query;
        let queryParams = [];
        let query = `
            SELECT 
                b.*, 
                c.name as court_name, 
                s.name as sport_name,
                b.total_price as total_amount,
                u.username as created_by_user,
                DATE_FORMAT(b.date, '%Y-%m-%d') as date,
                b.is_rescheduled
            FROM bookings b 
            JOIN courts c ON b.court_id = c.id
            JOIN sports s ON b.sport_id = s.id
            LEFT JOIN users u ON b.created_by_user_id = u.id
        `;

        let whereClauses = [];
        if (date) {
            whereClauses.push('b.date = ?');
            queryParams.push(date);
        }
        if (sport) {
            whereClauses.push('s.name LIKE ?');
            queryParams.push(`%${sport}%`);
        }
        if (customer) {
            whereClauses.push('b.customer_name LIKE ?');
            queryParams.push(`%${customer}%`);
        }

        if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
        }

        query += ' ORDER BY b.date DESC';

        const [rows] = await db.query(query, queryParams);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// New endpoint for availability heatmap
router.get('/availability/heatmap', authenticateToken, async (req, res) => {
    const { date } = req.query;
    if (!date) {
        return res.status(400).json({ message: 'Date parameter is required' });
    }

    try {
        const [courts] = await db.query('SELECT c.id, c.name, c.status, s.name as sport_name, s.capacity FROM courts c JOIN sports s ON c.sport_id = s.id ORDER BY s.name, c.name');
        const [bookings] = await db.query('SELECT * FROM bookings WHERE date = ? AND status != ?', [date, 'Cancelled']);

        const timeSlots = Array.from({ length: 16 }, (_, i) => {
            const hour = 6 + i;
            return `${String(hour).padStart(2, '0')}:00`;
        });

        const heatmap = courts.map(court => {
            const courtBookings = bookings.filter(b => b.court_id === court.id);
            const slots = timeSlots.map(slot => {
                const slotStartHour = parseInt(slot.split(':')[0]);
                
                const subSlots = [0, 30].map(minute => {
                    const subSlotStartMinutes = slotStartHour * 60 + minute;
                    const subSlotEndMinutes = subSlotStartMinutes + 30;

                    let availability = 'available';
                    let booking_details = null;

                    if (court.status === 'Under Maintenance') {
                        availability = 'maintenance';
                    } else {
                        const overlappingBookings = courtBookings.filter(b => {
                            const [startStr, endStr] = b.time_slot.split(' - ');
                            const toMinutes = (timeStr) => {
                                const [time, modifier] = timeStr.split(' ');
                                let [hours, minutes] = time.split(':').map(Number);
                                if (modifier === 'PM' && hours < 12) hours += 12;
                                if (modifier === 'AM' && hours === 12) hours = 0;
                                return hours * 60 + minutes;
                            };
                            const bookingStart = toMinutes(startStr);
                            const bookingEnd = toMinutes(endStr);

                            return subSlotStartMinutes < bookingEnd && subSlotEndMinutes > bookingStart;
                        });

                        if (overlappingBookings.length > 0) {
                            booking_details = overlappingBookings.map(b => ({ id: b.id, customer_name: b.customer_name, time_slot: b.time_slot, slots_booked: b.slots_booked }));
                            if (court.capacity > 1) {
                                const slots_booked = overlappingBookings.reduce((acc, curr) => acc + curr.slots_booked, 0);
                                if (slots_booked >= court.capacity) {
                                    availability = 'full';
                                } else {
                                    availability = 'partial';
                                }
                            } else {
                                availability = 'booked';
                            }
                        }
                    }
                    return { availability, booking: booking_details };
                });

                return { time: slot, subSlots };
            });

            return { ...court, slots };
        });

        res.json(heatmap);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get active bookings
router.get('/bookings/active', authenticateToken, async (req, res) => {
    try {
        const now = new Date();
        const today = now.toISOString().slice(0, 10);

        const query = `
            SELECT 
                b.*, 
                c.name as court_name, 
                s.name as sport_name
            FROM bookings b 
            JOIN courts c ON b.court_id = c.id
            JOIN sports s ON b.sport_id = s.id
            WHERE b.date = ?
        `;
        const [bookings] = await db.query(query, [today]);

        const parseTime = (timeStr) => {
            const [time, modifier] = timeStr.split(' ');
            let [hours, minutes] = time.split(':').map(Number);
            if (modifier === 'PM' && hours < 12) {
                hours += 12;
            }
            if (modifier === 'AM' && hours === 12) {
                hours = 0;
            }
            const date = new Date();
            date.setHours(hours, minutes, 0, 0);
            return date;
        };

        const activeBookings = bookings.map(booking => {
            const [startTimeStr, endTimeStr] = booking.time_slot.split(' - ');
            const startTime = parseTime(startTimeStr);
            const endTime = parseTime(endTimeStr);

            let status = 'upcoming';
            if (now >= startTime && now <= endTime) {
                status = 'active';
            } else if (now > endTime) {
                status = 'ended';
            }
            return { ...booking, status, startTime, endTime };
        });

        res.json(activeBookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generate PDF receipt
router.get('/booking/:id/receipt.pdf', async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT 
                b.id as booking_id,
                b.customer_name,
                b.customer_contact,
                DATE_FORMAT(b.date, '%Y-%m-%d') as date,
                b.time_slot,
                b.payment_mode,
                b.amount_paid,
                b.balance_amount,
                b.payment_status,
                b.status as booking_status,
                c.name as court_name,
                s.name as sport_name,
                b.total_price as total_amount,
                u.username as created_by
            FROM bookings b
            JOIN courts c ON b.court_id = c.id
            JOIN sports s ON b.sport_id = s.id
            LEFT JOIN users u ON b.created_by_user_id = u.id
            WHERE b.id = ?
        `;
        const [rows] = await db.query(query, [id]);
        if (rows.length === 0) {
            return res.status(404).send('Booking not found');
        }
        const booking = rows[0];

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="receipt-${booking.booking_id}.pdf"`,
                'Content-Length': pdfData.length
            });
            res.end(pdfData);
        });

        // Header
        doc.fontSize(20).text('ARC SportsZone Booking Receipt', { align: 'center' });
        doc.moveDown();

        // Booking Details
        doc.fontSize(12).text(`Booking ID: ${booking.booking_id}`);
        doc.text(`Date: ${booking.date}`);
        doc.text(`Time: ${booking.time_slot}`);
        doc.moveDown();

        // Customer Details
        doc.fontSize(14).text('Customer Details', { underline: true });
        doc.fontSize(12).text(`Name: ${booking.customer_name}`);
        doc.text(`Contact: ${booking.customer_contact}`);
        doc.moveDown();
        
        // Booking Info
        doc.fontSize(14).text('Booking Information', { underline: true });
        doc.fontSize(12).text(`Sport: ${booking.sport_name}`);
        doc.text(`Court: ${booking.court_name}`);
        doc.moveDown();

        // Payment Details
        doc.fontSize(14).text('Payment Details', { underline: true });
        doc.fontSize(12).text(`Total Amount: Rs. ${booking.total_amount}`);
        doc.text(`Amount Paid: Rs. ${booking.amount_paid}`);
        doc.font('Helvetica-Bold').text(`Balance: Rs. ${booking.balance_amount}`);
        doc.font('Helvetica').text(`Payment Status: ${booking.payment_status}`);
        doc.moveDown();

        // Footer
        doc.fontSize(10).text('Thank you for your booking!', { align: 'center' });

        doc.end();

    } catch (err) {
        console.error(err);
        res.status(500).send('Error generating PDF');
    }
});


// Calculate price dynamically
router.post('/bookings/calculate-price', authenticateToken, async (req, res) => {
    const { sport_id, startTime, endTime, slots_booked } = req.body;

    if (!sport_id || !startTime || !endTime) {
        return res.status(400).json({ message: 'sport_id, startTime, and endTime are required.' });
    }

    try {
        const [sports] = await db.query('SELECT price FROM sports WHERE id = ?', [sport_id]);
        if (sports.length === 0) {
            return res.status(404).json({ message: 'Sport not found' });
        }
        const hourly_price = sports[0].price;

        const parseTime = (timeStr) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        };
        const durationInMinutes = parseTime(endTime) - parseTime(startTime);

        if (durationInMinutes < 30) { // Only charge for 30 mins or more
            return res.json({ total_price: 0 });
        }

        const num_of_hours = Math.floor(durationInMinutes / 60);
        const remaining_minutes = durationInMinutes % 60;
        
        let total_price = num_of_hours * hourly_price;
        if (remaining_minutes >= 30) {
            total_price += hourly_price / 2;
        }

        if (slots_booked > 1) {
            total_price *= slots_booked;
        }

        res.json({ total_price });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a new booking
router.post('/bookings', authenticateToken, async (req, res) => {
    const { court_id, customer_name, customer_contact, customer_email, date, startTime,             endTime,
            payment_mode,
            payment_id, // Added payment_id
            amount_paid,
            slots_booked } = req.body;
    const created_by_user_id = req.user.id; // Get user ID from JWT

    try {
        const [courts] = await db.query('SELECT sport_id FROM courts WHERE id = ?', [court_id]);
        if (courts.length === 0) {
            return res.status(404).json({ message: 'Court not found' });
        }
        const sport_id = courts[0].sport_id;

        const [sports] = await db.query('SELECT price, capacity FROM sports WHERE id = ?', [sport_id]);
        if (sports.length === 0) {
            return res.status(404).json({ message: 'Sport not found' });
        }
        const hourly_price = sports[0].price;
        const capacity = sports[0].capacity;

        // New duration-based pricing logic
        const parseTime = (timeStr) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        };
        const durationInMinutes = parseTime(endTime) - parseTime(startTime);

        if (durationInMinutes <= 0) {
            return res.status(400).json({ message: 'End time must be after start time.' });
        }

        const num_of_hours = Math.floor(durationInMinutes / 60);
        const remaining_minutes = durationInMinutes % 60;
        
        let total_price = num_of_hours * hourly_price;
        if (remaining_minutes >= 30) {
            total_price += hourly_price / 2;
        }

        if (slots_booked > 1) {
            total_price *= slots_booked;
        }
        // End of new pricing logic

        const balance_amount = total_price - amount_paid;

        let payment_status = 'Pending';
        if (amount_paid > 0) {
            payment_status = balance_amount <= 0 ? 'Completed' : 'Received';
        }

        const [existingBookings] = await db.query('SELECT time_slot, slots_booked FROM bookings WHERE court_id = ? AND date = ? AND status != ?', [court_id, date, 'Cancelled']);
        
        const toMinutes = (timeStr) => {
            const [time, modifier] = timeStr.split(' ');
            let [hours, minutes] = time.split(':').map(Number);
            if (modifier === 'PM' && hours < 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
            return hours * 60 + minutes;
        };

        const checkOverlap = (startA, endA, startB, endB) => {
            const startAMin = toMinutes(startA);
            const endAMin = toMinutes(endA);
            const startBMin = toMinutes(startB);
            const endBMin = toMinutes(endB);
            return startAMin < endBMin && endAMin > startBMin;
        };

        const isOverlapping = existingBookings.some(booking => {
            const [existingStart, existingEnd] = booking.time_slot.split(' - ');
            return checkOverlap(startTime, endTime, existingStart.trim(), existingEnd.trim());
        });

        if (isOverlapping) {
            if (capacity > 1) {
                const slotsBooked = existingBookings.reduce((total, booking) => total + booking.slots_booked, 0);
                const availableSlots = capacity - slotsBooked;
                if (slots_booked > availableSlots) {
                    return res.status(409).json({ message: 'Not enough slots available for the selected time.' });
                }
            } else {
                return res.status(409).json({ message: 'The selected time slot is unavailable.' });
            }
        }

        const formatTo12Hour = (time) => {
            let [hours, minutes] = time.split(':').map(Number);
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            minutes = minutes < 10 ? '0' + minutes : minutes;
            return `${hours}:${minutes} ${ampm}`;
        };

        const time_slot = `${formatTo12Hour(startTime)} - ${formatTo12Hour(endTime)}`;
        const [result] = await db.query(
            'INSERT INTO bookings (court_id, sport_id, created_by_user_id, customer_name, customer_contact, customer_email, date, time_slot, total_price, amount_paid, balance_amount, payment_status, payment_mode, payment_id, slots_booked, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [court_id, sport_id, created_by_user_id, customer_name, customer_contact, customer_email, date, time_slot, total_price, amount_paid, balance_amount, payment_status, payment_mode, payment_id, slots_booked, 'Booked']
        );
        res.json({ success: true, bookingId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Update an existing booking
router.put('/bookings/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const {
        customer_name,
        customer_contact,
        customer_email,
        date: newDate, // Renaming for clarity
        startTime,
        endTime,
        amount_paid,
        payment_mode,
        payment_status,
        status
    } = req.body;

    try {
        // 1. Get existing booking details
        const [existingBookings] = await db.query('SELECT * FROM bookings WHERE id = ?', [id]);
        if (existingBookings.length === 0) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        const existingBooking = existingBookings[0];
        const { court_id, sport_id } = existingBooking;

        const dateForConflictCheck = newDate ? new Date(newDate).toISOString().slice(0, 10) : existingBooking.date;

        // 2. Format new time slot and check for conflicts if time or date is changing
        const formatTo12Hour = (time) => {
            let [hours, minutes] = time.split(':').map(Number);
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            minutes = minutes < 10 ? '0' + minutes : minutes;
            return `${hours}:${minutes} ${ampm}`;
        };

        const newTimeSlot = `${formatTo12Hour(startTime)} - ${formatTo12Hour(endTime)}`;

        if (newTimeSlot !== existingBooking.time_slot || dateForConflictCheck !== existingBooking.date) {
            const [conflictingBookings] = await db.query(
                'SELECT * FROM bookings WHERE court_id = ? AND date = ? AND id != ? AND status != ?',
                [court_id, dateForConflictCheck, id, 'Cancelled']
            );

            const toMinutes = (timeStr) => {
                const [time, modifier] = timeStr.split(' ');
                let [hours, minutes] = time.split(':').map(Number);
                if (modifier === 'PM' && hours < 12) hours += 12;
                if (modifier === 'AM' && hours === 12) hours = 0;
                return hours * 60 + minutes;
            };

            const checkOverlap = (startA, endA, startB, endB) => {
                const startAMin = toMinutes(startA);
                const endAMin = toMinutes(endA);
                const startBMin = toMinutes(startB);
                const endBMin = toMinutes(endB);
                return startAMin < endBMin && endAMin > startBMin;
            };

            const isOverlapping = conflictingBookings.some(booking => {
                const [existingStart, existingEnd] = booking.time_slot.split(' - ');
                return checkOverlap(formatTo12Hour(startTime), formatTo12Hour(endTime), existingStart.trim(), existingEnd.trim());
            });

            if (isOverlapping) {
                return res.status(409).json({ message: 'The selected time slot conflicts with another booking.' });
            }
        }

        // 3. Recalculate price
        const [sports] = await db.query('SELECT price FROM sports WHERE id = ?', [sport_id]);
        const hourly_price = sports[0].price;

        const parseTime = (timeStr) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        };
        const durationInMinutes = parseTime(endTime) - parseTime(startTime);
        
        let total_price = 0;
        if (durationInMinutes > 0) {
            const num_of_hours = Math.floor(durationInMinutes / 60);
            const remaining_minutes = durationInMinutes % 60;
            total_price = num_of_hours * hourly_price;
            if (remaining_minutes >= 30) {
                total_price += hourly_price / 2;
            }
        }

        const balance_amount = total_price - amount_paid;

        // 4. Update the booking
        const is_rescheduled = newTimeSlot !== existingBooking.time_slot || dateForConflictCheck !== existingBooking.date;

        const sql = `
            UPDATE bookings 
            SET customer_name = ?, customer_contact = ?, customer_email = ?, date = ?, time_slot = ?, total_price = ?, amount_paid = ?, balance_amount = ?, payment_mode = ?, payment_status = ?, status = ?, is_rescheduled = ?
            WHERE id = ?
        `;
        const values = [
            customer_name,
            customer_contact,
            customer_email,
            dateForConflictCheck,
            newTimeSlot,
            total_price,
            amount_paid,
            balance_amount,
            payment_mode,
            payment_status,
            status,
            is_rescheduled,
            id
        ];

        await db.query(sql, values);

        res.json({ success: true, message: 'Booking updated successfully' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update payment status for a booking
router.put('/bookings/:id/payment', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { amount_paid, payment_status } = req.body;

    try {
        // First, get the total_price directly from the booking
        const [bookings] = await db.query('SELECT total_price FROM bookings WHERE id = ?', [id]);
        if (bookings.length === 0) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        const total_price = bookings[0].total_price;

        const new_balance = total_price - amount_paid;

        await db.query(
            'UPDATE bookings SET amount_paid = ?, balance_amount = ?, payment_status = ? WHERE id = ?',
            [amount_paid, new_balance, payment_status, id]
        );
        res.json({ success: true, message: 'Payment updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Cancel a booking
router.put('/bookings/:id/cancel', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("UPDATE bookings SET status = 'Cancelled' WHERE id = ?", [id]);
        res.json({ success: true, message: 'Booking cancelled successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update court status
router.put('/courts/:id/status', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await db.query('UPDATE courts SET status = ? WHERE id = ?', [status, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a new sport
router.post('/sports', authenticateToken, isAdmin, async (req, res) => {
    const { name, price } = req.body;
    if (!name || price === undefined) {
        return res.status(400).json({ message: 'Sport name and price are required' });
    }
    try {
        const [result] = await db.query('INSERT INTO sports (name, price) VALUES (?, ?)', [name, price]);
        res.json({ success: true, sportId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update sport price
router.put('/sports/:id', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { price } = req.body;
    if (price === undefined) {
        return res.status(400).json({ message: 'Price is required' });
    }
    try {
        await db.query('UPDATE sports SET price = ? WHERE id = ?', [price, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a new court
router.post('/courts', authenticateToken, isAdmin, async (req, res) => {
    const { name, sport_id } = req.body;
    if (!name || !sport_id) {
        return res.status(400).json({ message: 'Court name and sport ID are required' });
    }
    try {
        const [result] = await db.query('INSERT INTO courts (name, sport_id) VALUES (?, ?)', [name, sport_id]);
        res.json({ success: true, courtId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a court
router.delete('/courts/:id', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM courts WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a sport
router.delete('/sports/:id', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM sports WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Analytics: Summary
router.get('/analytics/summary', authenticateToken, isAdmin, async (req, res) => {
    try {
        const [[{ total_bookings }]] = await db.query('SELECT COUNT(*) as total_bookings FROM bookings WHERE status != ?', ['Cancelled']);
        const [[{ total_revenue }]] = await db.query('SELECT SUM(amount_paid) as total_revenue FROM bookings WHERE status != ?', ['Cancelled']);
        const [[{ total_cancellations }]] = await db.query('SELECT COUNT(*) as total_cancellations FROM bookings WHERE status = ?', ['Cancelled']);
        const [[{ total_sports }]] = await db.query('SELECT COUNT(*) as total_sports FROM sports');
        const [[{ total_courts }]] = await db.query('SELECT COUNT(*) as total_courts FROM courts');

        res.json({
            total_bookings,
            total_revenue,
            total_cancellations,
            total_sports,
            total_courts
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Analytics: Bookings over time
router.get('/analytics/bookings-over-time', authenticateToken, isAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT DATE(date) as date, COUNT(*) as count 
            FROM bookings 
            GROUP BY DATE(date) 
            ORDER BY DATE(date) ASC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Analytics: Revenue by sport
router.get('/analytics/revenue-by-sport', authenticateToken, isAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT s.name, SUM(CASE WHEN b.total_price > 0 THEN b.total_price ELSE s.price END) as revenue
            FROM bookings b
            JOIN sports s ON b.sport_id = s.id
            WHERE b.status != ?
            GROUP BY s.name
            ORDER BY revenue DESC
        `, ['Cancelled']);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Analytics: Court Utilization Heatmap
router.get('/analytics/utilization-heatmap', authenticateToken, isAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                DAYNAME(date) as day_of_week,
                HOUR(STR_TO_DATE(SUBSTRING_INDEX(time_slot, ' - ', 1), '%h:%i %p')) as hour_of_day,
                COUNT(*) as booking_count
            FROM 
                bookings
            WHERE
                status != 'Cancelled'
            GROUP BY 
                day_of_week, hour_of_day
            ORDER BY
                FIELD(day_of_week, 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'),
                hour_of_day;
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Analytics: Booking Status Distribution
router.get('/analytics/booking-status-distribution', authenticateToken, isAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT status, COUNT(*) as count 
            FROM bookings 
            GROUP BY status
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Analytics: Court Popularity
router.get('/analytics/court-popularity', authenticateToken, isAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT c.name, COUNT(b.id) as booking_count 
            FROM bookings b
            JOIN courts c ON b.court_id = c.id
            WHERE b.status != 'Cancelled'
            GROUP BY c.name 
            ORDER BY booking_count DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Analytics: Staff Performance
router.get('/analytics/staff-performance', authenticateToken, isAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT u.username, COUNT(b.id) as booking_count
            FROM bookings b
            JOIN users u ON b.created_by_user_id = u.id
            WHERE b.status != 'Cancelled'
            GROUP BY u.username
            ORDER BY booking_count DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ledger Download
router.get('/ledger/download', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                b.id as booking_id,
                b.customer_name,
                b.customer_contact,
                b.customer_email,
                s.name as sport_name,
                c.name as court_name,
                DATE_FORMAT(b.date, '%Y-%m-%d') as date,
                b.time_slot,
                b.payment_mode,
                b.amount_paid,
                b.balance_amount,
                b.payment_status,
                b.status as booking_status,
                u.username as created_by
            FROM bookings b
            JOIN courts c ON b.court_id = c.id
            JOIN sports s ON b.sport_id = s.id
            LEFT JOIN users u ON b.created_by_user_id = u.id
            ORDER BY b.id DESC
        `);

        const fields = ['booking_id', 'customer_name', 'customer_contact', 'customer_email', 'sport_name', 'court_name', 'date', 'time_slot', 'payment_mode', 'amount_paid', 'balance_amount', 'payment_status', 'booking_status', 'created_by'];
        const json2csv = require('json2csv').parse;
        const csv = json2csv(rows, { fields });

        res.header('Content-Type', 'text/csv');
        res.attachment('ledger.csv');
        res.send(csv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Note: The WhatsApp route is not protected by JWT auth as it's for external users.
router.post('/whatsapp', async (req, res) => {

    const twiml = new twilio.twiml.MessagingResponse();
    const userMessage = req.body.Body; // Use original case for names, etc.
    const trimmedMessage = userMessage.trim();
    const from = req.body.From;
    const to = req.body.To;

    const formatTo12Hour = (time) => {
        let [hours, minutes] = time.split(':').map(Number);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        return `${hours}:${minutes} ${ampm}`;
    };

    let session = userSessions[from];

    if (!session) {
        session = { step: 'welcome' };
        userSessions[from] = session;
    }

    if (trimmedMessage.toLowerCase() === 'hi') {
        // Reset session
        userSessions[from] = { step: 'welcome' };
        session = userSessions[from];
    }

    try {
        switch (session.step) {
            case 'welcome':
                const [sports] = await db.query('SELECT * FROM sports');
                let sportList = sports.map(s => s.name).join('\n');
                twiml.message(`Welcome to ARC SportsZone Booking!\n\nPlease select a sport by replying with the name:${sportList}`);
                session.step = 'select_sport';
                break;

            case 'select_sport':
                const [selectedSport] = await db.query('SELECT * FROM sports WHERE name LIKE ?', [`%${trimmedMessage}%`]);
                if (selectedSport.length > 0) {
                    session.sport_id = selectedSport[0].id;
                    session.sport_name = selectedSport[0].name;
                    session.amount = selectedSport[0].price;
                    twiml.message('Great! Please enter the date for your booking (e.g., YYYY-MM-DD).');
                    session.step = 'select_date';
                } else {
                    twiml.message('Invalid sport. Please select a sport from the list.');
                }
                break;

            case 'select_date':
                // Basic validation for date format
                if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(trimmedMessage)) {
                    twiml.message('Invalid date format. Please use YYYY-MM-DD.');
                    break;
                }
                session.date = trimmedMessage;
                twiml.message('Please enter the start time for your booking (e.g., 10:00 or 14:00).');
                session.step = 'select_time';
                break;

            case 'select_time':
                // Basic validation for time format
                if (!/^\\d{2}:\\d{2}$/.test(trimmedMessage)) {
                    twiml.message('Invalid time format. Please use HH:MM (e.g., 09:00 or 15:00).');
                    break;
                }
                const startHour = parseInt(trimmedMessage.split(':')[0]);
                if (startHour < 6 || startHour > 21) {
                    twiml.message('Sorry, bookings are only available from 6:00 to 22:00. Please choose another time.');
                    break;
                }

                session.startTime = trimmedMessage;
                session.endTime = `${String(startHour + 1).padStart(2, '0')}:00`; // Assume 1 hour booking

                const time_slot_12hr = `${formatTo12Hour(session.startTime)} - ${formatTo12Hour(session.endTime)}`;

                const [availableCourts] = await db.query(
                    'SELECT c.id, c.name FROM courts c LEFT JOIN bookings b ON c.id = b.court_id AND b.date = ? AND b.time_slot = ? WHERE c.sport_id = ? AND c.status = ? AND b.id IS NULL',
                    [session.date, time_slot_12hr, session.sport_id, 'Available']
                );

                if (availableCourts.length > 0) {
                    session.court_id = availableCourts[0].id;
                    session.court_name = availableCourts[0].name;
                    twiml.message(`Court available! The price is ₹${session.amount}.\n\nPlease enter your full name to proceed.`);
                    session.step = 'enter_name';
                } else {
                    twiml.message('Sorry, no courts available at that time. Please try another time.');
                    session.step = 'select_time';
                }
                break;

            case 'enter_name':
                session.customer_name = trimmedMessage;
                twiml.message('Thank you. Please enter your 10-digit phone number.');
                session.step = 'enter_phone';
                break;

            case 'enter_phone':
                if (!/^\\d{10}$/.test(trimmedMessage)) {
                    twiml.message('Invalid phone number. Please enter a 10-digit number.');
                    break;
                }
                session.customer_contact = trimmedMessage;
                const time_slot = `${formatTo12Hour(session.startTime)} - ${formatTo12Hour(session.endTime)}`;
                const sql = 'INSERT INTO bookings (court_id, sport_id, customer_name, customer_contact, date, time_slot, payment_mode, amount_paid, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
                const values = [session.court_id, session.sport_id, session.customer_name, session.customer_contact, session.date, time_slot, 'online', session.amount, 'Booked'];
                
                try {
                    const [result] = await db.query(sql, values);
                    const bookingId = result.insertId;

                    // Send confirmation message
                    const receipt = `
*Booking Confirmed!*
-------------------------
Receipt ID: ${bookingId}
Name: ${session.customer_name}
Contact: ${session.customer_contact}
Sport: ${session.sport_name}
Court: ${session.court_name}
Date: ${session.date}
Time: ${time_slot}
Amount: ₹${session.amount}
Status: Booked
-------------------------
Thank you for booking with ARC SportsZone!
                    `;

                    await client.messages.create({
                        body: receipt,
                        from: to, // Twilio number
                        to: from  // User's number
                    });

                    twiml.message('Thank you! Your booking is confirmed. I have sent you a receipt.');
                    delete userSessions[from]; // End session

                } catch (dbError) {
                    console.error("Database error:", dbError);
                    twiml.message('Sorry, there was an error processing your booking. Please try again later.');
                    delete userSessions[from];
                }
                break;
        }
    } catch (error) {
        console.error('Error in /whatsapp route:', error);
        twiml.message('An unexpected error occurred. Please try again later.');
    }

    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
});

// Check for booking conflicts in real-time
router.post('/bookings/check-clash', authenticateToken, async (req, res) => {
    const { court_id, date, startTime, endTime, bookingId } = req.body;

    if (!court_id || !date || !startTime || !endTime) {
        return res.status(400).json({ message: 'court_id, date, startTime, and endTime are required.' });
    }

    try {
        const query = 'SELECT * FROM bookings WHERE court_id = ? AND date = ? AND status != ?' + (bookingId ? ' AND id != ?' : '');
        const params = [court_id, date, 'Cancelled'];
        if (bookingId) {
            params.push(bookingId);
        }

        const [conflictingBookings] = await db.query(query, params);

        const toMinutes = (timeStr) => {
            const [time, modifier] = timeStr.split(' ');
            let [hours, minutes] = time.split(':').map(Number);
            if (modifier === 'PM' && hours < 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
            return hours * 60 + minutes;
        };

        const checkOverlap = (startA, endA, startB, endB) => {
            const startAMin = toMinutes(startA);
            const endAMin = toMinutes(endA);
            const startBMin = toMinutes(startB);
            const endBMin = toMinutes(endB);
            return startAMin < endBMin && endAMin > startBMin;
        };

        const formatTo12Hour = (time) => {
            let [hours, minutes] = time.split(':').map(Number);
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            minutes = minutes < 10 ? '0' + minutes : minutes;
            return `${hours}:${minutes} ${ampm}`;
        };

        const newTimeSlot = `${formatTo12Hour(startTime)} - ${formatTo12Hour(endTime)}`;
        const [newStart, newEnd] = newTimeSlot.split(' - ');

        const isOverlapping = conflictingBookings.some(booking => {
            const [existingStart, existingEnd] = booking.time_slot.split(' - ');
            return checkOverlap(newStart.trim(), newEnd.trim(), existingStart.trim(), existingEnd.trim());
        });

        if (isOverlapping) {
            return res.status(200).json({ is_clashing: true, message: 'The selected time slot conflicts with another booking.' });
        } else {
            return res.status(200).json({ is_clashing: false, message: 'The selected time slot is available.' });
        }

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;