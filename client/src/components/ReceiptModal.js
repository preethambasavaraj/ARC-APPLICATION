import React from 'react';
import QRCode from 'react-qr-code';
import './ReceiptModal.css';

const ReceiptModal = ({ booking, onClose }) => {
    if (!booking) {
        return null;
    }

    // IMPORTANT: Replace with your actual public server URL in a real deployment
    const publicServerUrl = process.env.REACT_APP_RECIEPT_URL || 'http://localhost:5000'; 
    const receiptPdfUrl = `${publicServerUrl}/api/booking/${booking.id}/receipt.pdf`;

    const handlePrint = () => {
        const printContent = document.getElementById('receipt-content-to-print');
        const windowUrl = 'Receipt';
        const uniqueName = new Date().getTime();
        const windowName = windowUrl + '_' + uniqueName;
        const printWindow = window.open('', windowName, 'height=600,width=800');
        printWindow.document.write(`<html><head><title>${windowUrl}</title>`);
        printWindow.document.write('<link rel="stylesheet" href="ReceiptModal.css" type="text/css" />'); // Optional: link to your css
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContent.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div id="receipt-content-to-print">
                    <div className="receipt-header">
                        <h1>Booking Receipt</h1>
                        <p>ARC SportsZone</p>
                    </div>
                    <div className="receipt-body">
                        <div className="receipt-section">
                            <h2>Booking ID: {booking.id}</h2>
                            <p><strong>Customer:</strong> {booking.customer_name}</p>
                            <p><strong>Contact:</strong> {booking.customer_contact}</p>
                        </div>
                        <div className="receipt-section">
                            <h3>Booking Details</h3>
                            <p><strong>Sport:</strong> {booking.sport_name}</p>
                            <p><strong>Court:</strong> {booking.court_name}</p>
                            <p><strong>Date:</strong> {new Date(booking.date).toLocaleDateString()}</p>
                            <p><strong>Time:</strong> {booking.time_slot}</p>
                        </div>
                        <div className="receipt-section">
                            <h3>Payment Details</h3>
                            <p><strong>Total Amount:</strong> ₹{booking.total_amount}</p>
                            <p><strong>Amount Paid:</strong> ₹{booking.amount_paid}</p>
                            <p><strong>Balance:</strong> ₹{booking.balance_amount}</p>
                            <p><strong>Payment Status:</strong> <span className={`status ${booking.payment_status}`}>{booking.payment_status}</span></p>
                        </div>
                        <div className="receipt-footer">
                             <div className="qr-code">
                                <div style={{ height: "auto", margin: "0 auto", maxWidth: 100, width: "100%" }}>
                                    <QRCode
                                        size={256}
                                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                        value={receiptPdfUrl}
                                        viewBox={`0 0 256 256`}
                                    />
                                </div>
                                <p>Scan to Download PDF</p>
                            </div>
                            <div className="booking-info">
                                <p><strong>Booked By:</strong> {booking.created_by_user || 'N/A'}</p>
                                <p><strong>Booking Status:</strong> <span className={`status ${booking.status}`}>{booking.status}</span></p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="modal-actions">
                    <button onClick={handlePrint}>Print</button>
                    <button onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default ReceiptModal;
