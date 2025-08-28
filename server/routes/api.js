
const express = require('express');
const router = express.Router();
const db = require('../database');

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
    const { date, time_slot } = req.query;
    if (!date || !time_slot) {
        return res.status(400).json({ message: 'Date and time slot are required' });
    }

    try {
        const [courts] = await db.query('SELECT c.id, c.name, c.status, s.name as sport_name, s.price FROM courts c JOIN sports s ON c.sport_id = s.id');
        const [bookings] = await db.query('SELECT court_id FROM bookings WHERE date = ? AND time_slot = ?', [date, time_slot]);
        
        const bookedCourtIds = bookings.map(b => b.court_id);

        const availability = courts.map(court => ({
            ...court,
            is_available: !bookedCourtIds.includes(court.id) && court.status !== 'Under Maintenance'
        }));

        res.json(availability);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get bookings for a specific date
router.get('/bookings', async (req, res) => {
    const { date } = req.query;
    try {
        const [rows] = await db.query('SELECT b.*, c.name as court_name FROM bookings b JOIN courts c ON b.court_id = c.id WHERE b.date = ?', [date]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all bookings (ledger)
router.get('/bookings/all', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT b.*, c.name as court_name FROM bookings b JOIN courts c ON b.court_id = c.id ORDER BY b.date DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Add a new booking
router.post('/bookings', async (req, res) => {
    const { court_id, customer_name, customer_contact, customer_email, date, time_slot, payment_mode, amount_paid } = req.body;

    // Check for double booking
    try {
        const [existing] = await db.query('SELECT * FROM bookings WHERE court_id = ? AND date = ? AND time_slot = ?', [court_id, date, time_slot]);
        if (existing.length > 0) {
            return res.status(409).json({ message: 'Slot already booked' });
        }

        const sql = 'INSERT INTO bookings (court_id, customer_name, customer_contact, customer_email, date, time_slot, payment_mode, amount_paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        const values = [court_id, customer_name, customer_contact, customer_email, date, time_slot, payment_mode, amount_paid];

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

module.exports = router;
