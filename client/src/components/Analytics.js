import React, { useState, useEffect } from 'react';
import api from '../api';
import { Line, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Tooltip,
    Legend,
} from 'chart.js';
import './Analytics.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Tooltip,
    Legend
);

const Analytics = () => {
    const [summary, setSummary] = useState({});
    const [bookingsOverTime, setBookingsOverTime] = useState({});
    const [revenueBySport, setRevenueBySport] = useState({});

    useEffect(() => {
        const fetchAnalyticsData = async () => {
            try {
                const summaryRes = await api.get('/analytics/summary');
                setSummary(summaryRes.data);

                const bookingsOverTimeRes = await api.get('/analytics/bookings-over-time');
                setBookingsOverTime({
                    labels: bookingsOverTimeRes.data.map(d => new Date(d.date).toLocaleDateString()),
                    datasets: [{
                        label: 'Bookings',
                        data: bookingsOverTimeRes.data.map(d => d.count),
                        fill: false,
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    }]
                });

                const revenueBySportRes = await api.get('/analytics/revenue-by-sport');
                setRevenueBySport({
                    labels: revenueBySportRes.data.map(d => d.name),
                    datasets: [{
                        label: 'Revenue',
                        data: revenueBySportRes.data.map(d => d.revenue),
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.2)',
                            'rgba(54, 162, 235, 0.2)',
                            'rgba(255, 206, 86, 0.2)',
                            'rgba(75, 192, 192, 0.2)',
                            'rgba(153, 102, 255, 0.2)',
                            'rgba(255, 159, 64, 0.2)'
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 159, 64, 1)'
                        ],
                        borderWidth: 1
                    }]
                });

            } catch (error) {
                console.error("Error fetching analytics data:", error);
            }
        };

        fetchAnalyticsData();
    }, []);

    const handleDownloadLedger = async () => {
        try {
            const response = await api.get('/ledger/download', {
                responseType: 'blob', // Important
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'ledger.csv');
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (error) {
            console.error('Error downloading ledger:', error);
        }
    };

    return (
        <div className="analytics-container">
            <h2>Analytics Dashboard</h2>
            
            <div className="summary-cards">
                <div className="card">
                    <h4>Total Bookings</h4>
                    <p>{summary.total_bookings}</p>
                </div>
                <div className="card">
                    <h4>Total Revenue</h4>
                    <p>₹{summary.total_revenue}</p>
                </div>
                <div className="card">
                    <h4>Sports Offered</h4>
                    <p>{summary.total_sports}</p>
                </div>
                <div className="card">
                    <h4>Total Courts</h4>
                    <p>{summary.total_courts}</p>
                </div>
            </div>

            <div className="download-ledger">
                <button onClick={handleDownloadLedger}>Download Full Ledger (CSV)</button>
            </div>

            <div className="charts-grid">
                <div className="chart-card">
                    <h3>Bookings Over Time</h3>
                    {bookingsOverTime.labels && <Line data={bookingsOverTime} />}
                </div>
                <div className="chart-card">
                    <h3>Revenue by Sport</h3>
                    {revenueBySport.labels && <Pie data={revenueBySport} />}
                </div>
            </div>
        </div>
    );
};

export default Analytics;
