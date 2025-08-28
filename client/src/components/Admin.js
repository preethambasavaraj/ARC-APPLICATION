import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Admin = () => {
    const [sports, setSports] = useState([]);
    const [newSportName, setNewSportName] = useState('');
    const [newSportPrice, setNewSportPrice] = useState('');
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
            await axios.post('http://localhost:5000/api/sports', { name: newSportName, price: newSportPrice });
            setNewSportName('');
            setNewSportPrice('');
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

    const handlePriceChange = (e, sportId) => {
        const updatedSports = sports.map(sport =>
            sport.id === sportId ? { ...sport, price: e.target.value } : sport
        );
        setSports(updatedSports);
    };

    const handleUpdatePrice = async (sportId) => {
        const sportToUpdate = sports.find(s => s.id === sportId);
        try {
            await axios.put(`http://localhost:5000/api/sports/${sportId}`, { price: sportToUpdate.price });
            setMessage(`Price for ${sportToUpdate.name} updated successfully!`);
        } catch (err) {
            setMessage('Error updating price');
        }
    };

    return (
        <div>
            <h2>Admin Panel</h2>
            {message && <p>{message}</p>}
            <div style={{ display: 'flex', gap: '40px', marginBottom: '40px' }}>
                <div style={{ flex: 1 }}>
                    <h3>Add a New Sport</h3>
                    <form onSubmit={handleAddSport}>
                        <div>
                            <label>Sport Name</label>
                            <input type="text" value={newSportName} onChange={(e) => setNewSportName(e.target.value)} required />
                        </div>
                        <div>
                            <label>Price</label>
                            <input type="number" value={newSportPrice} onChange={(e) => setNewSportPrice(e.target.value)} required />
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

            <div>
                <h3>Edit Sport Prices</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Sport</th>
                            <th>Price</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sports.map(sport => (
                            <tr key={sport.id}>
                                <td>{sport.name}</td>
                                <td>
                                    <input type="number" value={sport.price} onChange={(e) => handlePriceChange(e, sport.id)} />
                                </td>
                                <td>
                                    <button onClick={() => handleUpdatePrice(sport.id)}>Update</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Admin;