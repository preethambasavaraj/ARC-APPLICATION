import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Admin = () => {
    const [sports, setSports] = useState([]);
    const [newSportName, setNewSportName] = useState('');
    const [newCourtName, setNewCourtName] = useState('');
    const [selectedSportId, setSelectedSportId] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchSports();
    }, []);

    const fetchSports = async () => {
        const res = await axios.get('http://localhost:5000/api/sports');
        setSports(res.data);
    };

    const handleAddSport = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/sports', { name: newSportName });
            setNewSportName('');
            fetchSports();
            setMessage('Sport added successfully!');
        } catch (err) {
            setMessage('Error adding sport');
        }
    };

    const handleAddCourt = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/courts', { name: newCourtName, sport_id: selectedSportId });
            setNewCourtName('');
            setSelectedSportId('');
            setMessage('Court added successfully!');
        } catch (err) {
            setMessage('Error adding court');
        }
    };

    return (
        <div>
            <h2>Admin Panel</h2>
            {message && <p>{message}</p>}
            <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                    <h3>Add a New Sport</h3>
                    <form onSubmit={handleAddSport}>
                        <div>
                            <label>Sport Name</label>
                            <input type="text" value={newSportName} onChange={(e) => setNewSportName(e.target.value)} required />
                        </div>
                        <button type="submit">Add Sport</button>
                    </form>
                </div>
                <div style={{ flex: 1 }}>
                    <h3>Add a New Court</h3>
                    <form onSubmit={handleAddCourt}>
                        <div>
                            <label>Sport</label>
                            <select value={selectedSportId} onChange={(e) => setSelectedSportId(e.target.value)} required>
                                <option value="">Select a Sport</option>
                                {sports.map(sport => (
                                    <option key={sport.id} value={sport.id}>{sport.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label>Court Name</label>
                            <input type="text" value={newCourtName} onChange={(e) => setNewCourtName(e.target.value)} required />
                        </div>
                        <button type="submit">Add Court</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Admin;
