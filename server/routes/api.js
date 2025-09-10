const express = require('express');
const router = express.Router();
const db = require('../database');
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = new twilio(accountSid, authToken);

const userSessions = {};

// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        if (rows.length > 0) {
            res.json({ success: true, user: rows[0] });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all sports
router.get('/sports', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM sports');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all courts
router.get('/courts', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT c.id, c.name, c.status, s.name as sport_name, s.price FROM courts c JOIN sports s ON c.sport_id = s.id');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get court availability for a specific date and time
router.get('/courts/availability', async (req, res) => {
    const { date, startTime, endTime } = req.query;
    if (!date || !startTime || !endTime) {
        return res.status(400).json({
            message: 'SERVER CODE IS UPDATED. Params are still missing.',
            received_query: req.query
        });
    }

    try {
        const [courts] = await db.query('SELECT c.id, c.name, c.status, s.name as sport_name, s.price FROM courts c JOIN sports s ON c.sport_id = s.id');
        const [bookings] = await db.query('SELECT court_id, time_slot FROM bookings WHERE date = ?', [date]);

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

            const isOverlapping = courtBookings.some(booking => {
                const [existingStart, existingEnd] = booking.time_slot.split(' - ');
                return checkOverlap(startTime, endTime, existingStart.trim(), existingEnd.trim());
            });

            return { ...court, is_available: !isOverlapping };
        });

        res.json(availability);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get bookings for a specific date
router.get('/bookings', async (req, res) => {
    const { date } = req.query;
    try {
        const query = `
            SELECT 
                b.*, 
                c.name as court_name, 
                u.username as created_by_user 
            FROM bookings b 
            JOIN courts c ON b.court_id = c.id
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
router.get('/bookings/all', async (req, res) => {
    try {
        let { date, sport, customer } = req.query;
        let queryParams = [];
        let query = `
            SELECT 
                b.*, 
                c.name as court_name, 
                s.name as sport_name,
                u.username as created_by_user,
                DATE_FORMAT(b.date, '%Y-%m-%d') as date
            FROM bookings b 
            JOIN courts c ON b.court_id = c.id
            JOIN sports s ON c.sport_id = s.id
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


// Add a new booking
router.post('/bookings', async (req, res) => {
    const { court_id, created_by_user_id, customer_name, customer_contact, customer_email, date, startTime, endTime, payment_mode, amount_paid } = req.body;

    try {
        const [courts] = await db.query('SELECT sport_id FROM courts WHERE id = ?', [court_id]);
        if (courts.length === 0) {
            return res.status(404).json({ message: 'Court not found' });
        }
        const sport_id = courts[0].sport_id;

        const [existingBookings] = await db.query('SELECT time_slot FROM bookings WHERE court_id = ? AND date = ?', [court_id, date]);
        
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
            return res.status(409).json({ message: 'The selected time slot is unavailable.' });
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
        const sql = 'INSERT INTO bookings (court_id, sport_id, created_by_user_id, customer_name, customer_contact, customer_email, date, time_slot, payment_mode, amount_paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const values = [court_id, sport_id, created_by_user_id, customer_name, customer_contact, customer_email, date, time_slot, payment_mode, amount_paid];

        const [result] = await db.query(sql, values);
        res.json({ success: true, bookingId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update court status
router.put('/courts/:id/status', async (req, res) => {
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
router.post('/sports', async (req, res) => {
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
router.put('/sports/:id', async (req, res) => {
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
router.post('/courts', async (req, res) => {
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
router.delete('/courts/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM courts WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a sport
router.delete('/sports/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM sports WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/whatsapp', async (req, res) => {
    const twiml = new twilio.twiml.MessagingResponse();
    const userMessage = req.body.Body; // Use original case for names, etc.
    const trimmedMessage = userMessage.trim();
    const from = req.body.From;
    const to = req.body.To;

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

    switch (session.step) {
        case 'welcome':
            const [sports] = await db.query('SELECT * FROM sports');
            let sportList = sports.map(s => s.name).join('\n');
            twiml.message(`Welcome to ARC SportsZone Booking!\n\nPlease select a sport by replying with the name:${sportList}`);
            session.step = 'select_sport';
            break;

        case 'select_sport':
            const [selectedSport] = await db.query('SELECT * FROM sports WHERE name = ?', [trimmedMessage]);
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
            if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedMessage)) {
                twiml.message('Invalid date format. Please use YYYY-MM-DD.');
                break;
            }
            session.date = trimmedMessage;
            twiml.message('Please enter the start time for your booking (e.g., 10:00 or 14:00).');
            session.step = 'select_time';
            break;

        case 'select_time':
            // Basic validation for time format
            if (!/^\d{2}:\d{2}$/.test(trimmedMessage)) {
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

            const time_slot_12hr = `${session.startTime} - ${session.endTime}`;

            const [availableCourts] = await db.query(
                'SELECT c.id, c.name FROM courts c LEFT JOIN bookings b ON c.id = b.court_id AND b.date = ? AND b.time_slot = ? WHERE c.sport_id = ? AND c.status = \"Available\" AND b.id IS NULL',
                [session.date, time_slot_12hr, session.sport_id]
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
            if (!/^\d{10}$/.test(trimmedMessage)) {
                twiml.message('Invalid phone number. Please enter a 10-digit number.');
                break;
            }
            session.customer_contact = trimmedMessage;
            const time_slot = `${session.startTime} - ${session.endTime}`;
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
Time: ${session.startTime} - ${session.endTime}
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

    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
});

module.exports = router;