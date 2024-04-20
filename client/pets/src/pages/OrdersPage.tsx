import React, { useState, useEffect } from 'react';
import {Card, Button, Modal, Spinner} from 'react-bootstrap';
import { FaStar } from 'react-icons/fa';
import { Order } from '../interfaces/order.ts';
import ButtonComponent from '../components/Button/Button.tsx';
import { useNavigate } from 'react-router-dom';
import {CiStar} from "react-icons/ci";

const OrdersPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[] | null>(null);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        const response = await fetch('http://localhost:3001/api/orders', {
            credentials: 'include'
        });
        const data = await response.json();
        if (data.error) {
            //todo do error but lazy rn
        } else {
            data.filteredOrders.sort((a: Order, b: Order) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setOrders(data.filteredOrders);
        }
    };

    const handleReorder = async (order: Order) => {
        try {
            const response = await fetch(`http://localhost:3001/api/orders/reorder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: order.orderId }),
                credentials: 'include'
            });

            if (!response.ok) {
                // do error but lazy rn
            }

            window.location.href = '/cart';
        } catch (error) {
            console.error(error);
        }
    };

    const handleOpenRatingModal = () => {
        setShowRatingModal(true);
    };

    const handleCloseRatingModal = () => {
        setShowRatingModal(false);
    };

    const handleOpenReportModal = () => {
        setShowReportModal(true);
    };

    const handleCloseReportModal = () => {
        setShowReportModal(false);
    };

    const handleTrackOrder = (orderId: number) => {
        navigate(`/user/orders/track/${orderId}`);
    };

    if (!orders) {
        return <div style={{marginTop: 150}}>
            <p>Loading... </p>
            <Spinner animation="grow"/>
        </div>
    }

    return (
        <div style={{marginTop: 100}}>
            <h1>Orders</h1>
            {orders.length === 0 && <p>You have no orders<br/>start by making an order now!</p>}
            {orders && orders.map(order => {
                const status = order.trace.length > 0 ? order.trace[order.trace.length - 1].type : 'N/A';
                const statusClass = `order-status-${status}`;
                let count = 0;
                order.items.map(item => {
                    count += item.quantity;
                });

                return (
                    <div className="orders-container">
                        <Card key={order.orderId} className={`order-card ${statusClass}`}>
                            <div className="item-images">
                                {order.items.map(item => (
                                    <img src={item.picture} alt={item.itemId} className="item-image"/>
                                ))}
                            </div>
                            <Card.Body>
                                <Card.Title>{count} Items</Card.Title>
                                <Card.Text>
                                    Total Cost: {order.finalAmount}<br/>
                                    Order Date: {new Date(order.date).toLocaleDateString()}<br/>
                                    Order
                                    Status: {order.trace.length > 0 ? order.trace[order.trace.length - 1].type.charAt(0).toUpperCase() + order.trace[order.trace.length - 1].type.slice(1) : 'N/A'}
                                </Card.Text>
                                {status !== 'cancelled' && status !== 'delivered' && (
                                    <ButtonComponent onClick={() => handleTrackOrder(order.orderId)}>Track</ButtonComponent>
                                )}
                                {(status === 'delivered' || status === 'cancelled') && (
                                    <>
                                        <ButtonComponent style={{backgroundColor: 'orange'}} variant="primary" onClick={() => handleReorder(order)}>Reorder</ButtonComponent>
                                        {status !== 'cancelled' &&
                                            <div>
                                                {[...Array(5)].map((index) => {
                                                    return index < order.rating
                                                        ? <FaStar key={index} onClick={handleOpenRatingModal}/>
                                                        : <CiStar key={index} onClick={handleOpenRatingModal}/>
                                                })}
                                            </div>
                                        }
                                    </>
                                )}
                            </Card.Body>
                        </Card>
                    </div>
                );
            })}
            <Modal show={showRatingModal} onHide={handleCloseRatingModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Rate Your Order</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/* Todo */}
                    <ButtonComponent style={{backgroundColor: 'red'}} variant="primary" onClick={handleOpenReportModal}>Report a Problem</ButtonComponent>
                </Modal.Body>
            </Modal>
            <Modal show={showReportModal} onHide={handleCloseReportModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Report a Problem</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/* Todo */}
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default OrdersPage;