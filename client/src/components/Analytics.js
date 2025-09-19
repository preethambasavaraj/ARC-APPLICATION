import React, { useState, useEffect } from 'react';
import api from '../api';
import { Line, Pie, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
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
    BarElement,
    ArcElement,
    Tooltip,
    Legend
);

const Analytics = () => {
    const [summary, setSummary] = useState({});
    const [bookingsOverTime, setBookingsOverTime] = useState({});
    const [revenueBySport, setRevenueBySport] = useState({});
    const [utilizationData, setUtilizationData] = useState({});

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

                const utilizationRes = await api.get('/analytics/utilization-heatmap');
                const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const datasets = days.map((day, index) => {
                    const dayData = utilizationRes.data.filter(d => d.day_of_week === day);
                    return {
                        label: day,
                        data: hours.map(hour => {
                            const hourData = dayData.find(d => d.hour_of_day === hour);
                            return hourData ? hourData.booking_count : 0;
                        }),
                        backgroundColor: `rgba(${50 + index * 30}, ${150 - index * 10}, ${200}, 0.5)`
                    };
                });

                setUtilizationData({
                    labels: hours.map(h => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 || h === 24 ? 'AM' : 'PM'}`),
                    datasets: datasets
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
                    <h4>Total Cancellations</h4>
                    <p>{summary.total_cancellations}</p>
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
                <div className="chart-card full-width">
                    <h3>Court Utilization by Day and Hour</h3>
                    {utilizationData.labels && <Bar data={utilizationData} options={{ scales: { x: { stacked: true }, y: { stacked: true } } }} />}
                </div>
            </div>
        </div>
    );
};

export default Analytics;
