import React, { useState, useEffect } from 'react';
import {Table, Form, Button, FormControl, Spinner, Alert} from 'react-bootstrap';
import { OrderItem } from "../interfaces/orderItem.ts";
import { Location } from "../interfaces/location.ts";
import ImageComponent from "../components/Image/Image.tsx";
import Container from "react-bootstrap/Container";
import ButtonComponent from "../components/Button/Button.tsx";
import {useNavigate} from "react-router-dom";
import {FaMoneyBill, FaWallet} from "react-icons/fa";

const ShoppingCartPage: React.FC = () => {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState<OrderItem[] | null>(null);
    const [locations, setLocations] = useState<Location[]>([]);
    const [location, setLocation] = useState('');
    const [deliveryInstructions, setDeliveryInstructions] = useState('');
    const [tip, setTip] = useState('0');
    const [customTip, setCustomTip] = useState(0);
    const [promoCode, setPromoCode] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [deliveryFee, setDeliveryFee] = useState(20);
    const [discount, setDiscount] = useState(0);
    const [subTotal, setSubTotal] = useState(0);
    const [locationValid, setLocationValid] = useState(true);
    const [tipValid, setTipValid] = useState(true);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (cartItems) {
            const subtotal = cartItems.reduce((total: number, item: OrderItem) => total + (item.quantity * item.pricePerItem), 0);
            setSubTotal(subtotal);
            if (subtotal >= 200) {
                setDeliveryFee(0);
            }
            else {
                setDeliveryFee(20);
            }
        }
    }, [cartItems]);

    useEffect(() => {
        fetch('http://localhost:3001/api/cart', {
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => {
                setCartItems(data);
                const subtotal = data.reduce((total: number, item: OrderItem) => total + (item.quantity * item.pricePerItem), 0);
                setSubTotal(subtotal);
            });

        fetch('http://localhost:3001/api/users/locations', {
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => {
                setLocations(data);
                setLocation(data[0].locationId);
            });
    }, []);

    useEffect(() => {
        setDiscount(promoCode ? 10 : 0); // TODO: get discount from backend
    }, [promoCode]);

    useEffect(() => {
        fetch('http://localhost:3001/api/users/balance', {
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => setBalance(data.balance));
    }, []);

    const handleQuantityChange = async (itemId: string, quantity: number) => {
        const response = await fetch(`http://localhost:3001/api/cart`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({itemId, quantity}),
            credentials: 'include'
        });

        if (response.ok) {
            setCartItems(cartItems.map(item => item.itemId === itemId ? {...item, quantity} : item));
        }
    };

    const handleRemoveItem = async (itemId: string) => {
        const response = await fetch(`http://localhost:3001/api/cart`, {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({itemId, removeFromBasket: true}),
            credentials: 'include'
        });

        if (response.ok) {
            setCartItems(cartItems.filter(item => item.itemId !== itemId));
        }
    };

    const handlePromoCodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPromoCode(event.target.value);
    };

    const handleCheckout = async () => {
        if (!location) {
            setLocationValid(false);
            setError('Please select a location');
            return;
        }
        if (!cartItems || cartItems.length === 0) {
            setError('Cart is empty');
            return;
        }
        setLoading(true);
        const response = await fetch(`http://localhost:3001/api/orders`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                paymentMethod,
                locationId: location,
                deliveryInstructions,
                tip: (tip !== 'custom' ? parseFloat(tip) : Number(customTip)),
                promoCode
            }),
            credentials: 'include'
        }).then(response => response.json())
            .then(data => {
                if (!data.error) {
                    setCartItems([]);
                    navigate('/user/orders');
                }
                else {
                    setError(data.error);
                }
            });
        setLoading(false);
    };

    const handleLocationChange = (e: string) => {
        const value = e;
        setLocation(value);
        if (value === 'Add Location') {
            navigate('/user/add-location');
        } else {
            setLocationValid(value !== '');
        }
    };

    const handleTipChange = (value: string) => {
        if (value === 'custom' || Number(value) <= 100) {
            setTip(tip === value ? '0' : value);
            setTipValid(true);
        } else {
            setTipValid(false);
        }
    };

    const handleCustomTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value);
        if (value <= 100) {
            setCustomTip(value);
            setTipValid(true);
        } else {
            setTipValid(false);
        }
    };

    if (!cartItems) {
        return <div style={{marginTop: 150}}>
            <p>Loading... </p>
            <Spinner animation="grow"/>
        </div>
    }

    const finalTip = (tip !== 'custom' ? parseFloat(tip) : Number(customTip));
    const grandTotal = Number(subTotal + deliveryFee - discount + finalTip);
    const grandTotalWithBalance = Number(subTotal + deliveryFee - discount + finalTip - Math.min(grandTotal, balance));


    return (
        <Container style={{width: '100%', margin: 'auto', marginTop: 100, display: 'flex'}}>
            <Container>
            <Table striped bordered hover className="form-container">
                <thead>
                <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {cartItems.map(item => (
                    <tr key={item.itemId}>
                        <td>
                            <ImageComponent src={item.picture} alt={item.itemId} className="cart-item-image"/>
                            <p>{item.name}</p>
                        </td>
                        <td>
                            <Form.Control type="number" value={item.quantity}
                                          onChange={e => handleQuantityChange(item.itemId, Number(e.target.value))}/>
                        </td>
                        <td>{item.quantity * item.pricePerItem} EGP</td>
                        <td>
                            <Button variant="danger" onClick={() => handleRemoveItem(item.itemId)}>Remove</Button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </Table>
            </Container>
            <Container style={{display: 'grid', height: '80vh'}}>
                {error && <Alert variant="danger">{error}</Alert>}
            <Form.Group controlId="location" className="form-container">
                <Form.Label>Delivery Location</Form.Label>
                <Form.Control as="select" value={location} onChange={e => handleLocationChange(e.target.value)} isInvalid={!locationValid}>
                    {locations.map(loc => (
                        <option key={loc.locationId} value={loc.locationId}>{loc.locationId.split(' ')
                            .map((s: string) => s.charAt(0).toUpperCase() + s.substring(1))
                            .join(' ')}</option>
                    ))}
                    <option value="Add Location">Add Location</option>
                </Form.Control>
                <Form.Control.Feedback type="invalid">Please select a location.</Form.Control.Feedback>
            </Form.Group>
                <Form.Group controlId="deliveryInstructions" className="form-container">
                <Form.Label>Delivery Instructions</Form.Label>
                <Form.Control type="text" placeholder="E.g. Please call me when you arrive" value={deliveryInstructions}
                              onChange={e => setDeliveryInstructions(e.target.value)}/>
            </Form.Group>
            <Form.Group controlId="tip" className="form-container">
                <Form.Label>Say thanks with a tip</Form.Label>
                <p>The entire tip goes to the driver</p>
                <Container>
                    <Button style={{backgroundColor: tip === '5' ? '#037ba6' : '#82e50f', borderColor: 'green'}} variant="primary" active={tip === '5'} onClick={() => handleTipChange('5')}>5 EGP</Button>
                    <Button style={{backgroundColor: tip === '10' ? '#037ba6' : '#82e50f', borderColor: 'green'}} variant="primary" active={tip === '10'} onClick={() => handleTipChange('10')}>10 EGP</Button>
                    <Button style={{backgroundColor: tip === '20' ? '#037ba6' : '#82e50f', borderColor: 'green'}} variant="primary" active={tip === '20'} onClick={() => handleTipChange('20')}>20 EGP</Button>
                    <Button style={{backgroundColor: tip === 'custom' ? '#037ba6' : '#82e50f', borderColor: 'green'}} variant="primary" active={tip === 'custom'} onClick={() => handleTipChange('custom')}>Custom</Button>
                    {tip === 'custom' &&
                        <FormControl style={{marginTop: 10, marginBottom: 10}} placeholder="" type="number" value={customTip} onChange={handleCustomTipChange} isInvalid={!tipValid}/>
                    }
                    <Form.Control.Feedback type="invalid">Tip cannot exceed 100.</Form.Control.Feedback>
                </Container>
            </Form.Group>
            <Form.Group controlId="promoCode" className="form-container">
                <Form.Label>Promo Code</Form.Label>
                <Form.Control type="text" value={promoCode} onChange={handlePromoCodeChange}/>
            </Form.Group>
            <Form.Group controlId="paymentMethod" className="form-container">
                <Form.Label>Payment Method</Form.Label>
                <Form.Control as="select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                    <option value="cash"><FaMoneyBill/>Cash</option>
                    <option value="balance"><FaWallet/>Balance</option>
                </Form.Control>
            </Form.Group>
                <Container className="form-container">
                <h6>Subtotal: {subTotal} EGP</h6>
                <h6>Delivery Fee: {deliveryFee} EGP</h6>
                    {paymentMethod === 'balance' && <h6>Balance: -{Math.min(grandTotal, balance)} EGP</h6>}
                {tip !== '0' && <h6>Tip: {finalTip} EGP</h6>}
                {discount > 0 && <h6>Discount: -{discount} EGP</h6>}
                <h4>Grand Total: {paymentMethod === 'balance' ? grandTotalWithBalance : grandTotal} EGP</h4>
                    {paymentMethod === 'balance' && balance < grandTotal && (
                        <>
                            <h6>Payment Method: Cash + Balance</h6>
                        </>
                    )}
                    {paymentMethod === 'balance' && balance >= grandTotal && (
                        <>
                            <h6>Payment Method: Balance</h6>
                        </>
                    )}
                    {deliveryFee === 0 && <h6>Order is above 200, enjoy free delivery!</h6>
                    }
            </Container>
            <ButtonComponent disabled={loading} variant="primary" onClick={handleCheckout}>{loading ? "Checking out..." : "Checkout"}</ButtonComponent>
        </Container>
        </Container>
    );
};

export default ShoppingCartPage;