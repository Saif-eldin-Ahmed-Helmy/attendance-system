import React, { useEffect, useState } from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {Spinner, Button, InputGroup, FormControl, Container} from "react-bootstrap";
import {Item} from "../interfaces/item.ts";
import ButtonComponent from "../components/Button/Button.tsx";
import ProductsList from "../components/ProductsList/ProductsList.tsx";
import {toast, ToastContainer} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ProductPage: React.FC = () => {
    const navigate = useNavigate();
    const {itemId} = useParams();
    const [item, setItem] = useState<Item | null>(null);
    const [quantity, setQuantity] = useState<number>(1);
    const [cartItems, setCartItems] = useState<Item[] | null>(null);
    const [similarProducts, setSimilarProducts] = useState<Item[] | null>(null);
    const [disableBuyButton, setDisableBuyButton] = useState(true);

    useEffect(() => {
        fetchCartItems();
        fetchSimilarProducts();
        fetchItem();

        const timeoutId = setTimeout(() => {
            setDisableBuyButton(false);
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [itemId]);

    useEffect(() => {
        if (cartItems) {
            const isInCart = cartItems.find(cartItem => cartItem.itemId === itemId);
            if (isInCart) {
                handleSetQuantity();
            }
        }
    }, [quantity]);

    const fetchItem = async () => {
        const response = await fetch(`http://localhost:3001/api/items?itemId=${itemId}`);
        const data = await response.json();
        setItem(data.items[0]);
    };

    const fetchSimilarProducts = async () => {
        const response = await fetch(`http://localhost:3001/api/items?similarTo=${itemId}&limit=4`);
        const data = await response.json();
        setSimilarProducts(data.items);
    };

    const fetchCartItems = async () => {
        const response = await fetch('http://localhost:3001/api/cart', {
            credentials: 'include'
        });
        const data = await response.json();
        if (!data.error) {
            setCartItems(data);
            setQuantity(data.find(cartItem => cartItem.itemId === itemId)?.quantity || 1);
        }
    };

    const handleBuy = async () => {
        setCartItems([...cartItems, {itemId, quantity}]);

        const response = await fetch(`http://localhost:3001/api/cart`, {
            credentials: 'include',
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({itemId, quantity})
        });
        const data = await response.json();
        if (data.error) {
            setCartItems(cartItems);
            navigate('/login');
        } else {
            setCartItems([...cartItems, {itemId, quantity}]);
        }
    };

    const handleSetQuantity = async () => {
        if (quantity <= 0) {
            await handleRemoveFromBasket();
        } else {
            const response = await fetch(`http://localhost:3001/api/cart`, {
                credentials: 'include',
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({itemId, quantity})
            });
            const data = await response.json();
            if (data.error) {
                navigate('/login');
            }
        }
    }

    const handleRemoveFromBasket = async () => {
        setCartItems(cartItems.filter(cartItem => cartItem.itemId !== itemId));
        toast.success('Item removed from basket!', {
            position: toast.POSITION.BOTTOM_RIGHT,
            autoClose: 2000
        });

        const response = await fetch(`http://localhost:3001/api/cart`, {
            credentials: 'include',
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({itemId, removeFromBasket: true})
        });
        const data = await response.json();
        if (data.error) {
            setCartItems([...cartItems, {itemId, quantity}]);
            navigate('/login');
        } else {
            setCartItems(cartItems.filter(cartItem => cartItem.itemId !== itemId));
            setQuantity(1);
        }
    };

    if (!item || !similarProducts || !cartItems) {
        return <div style={{marginTop: 150}}>
            <p>Loading... </p>
            <Spinner animation="grow"/>
        </div>
    }

    const isInCart = cartItems.find(cartItem => cartItem.itemId === itemId);

    return (
        <div style={{
            marginTop: 150,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <ToastContainer/>
            <div style={{width: '40vw'}}>
                <img src={item.picture} alt={item.name} style={{maxWidth: '100%', maxHeight: '400px'}}/>
                <h1>{item.name}</h1>
                <hr/>
                <h3 style={{color: "gold"}}>EGP {item.price.toFixed(2)}</h3>
                <p style={{fontSize: '0.8em'}}>{item.description}</p>
                {isInCart ? (
                    <InputGroup className="mb-3">
                        <Button variant="outline-secondary"
                                onClick={() => setQuantity(Math.max(0, quantity - 1))}>-</Button>
                        <FormControl aria-label="Quantity" value={quantity} readOnly={true}
                                     max={item.stock}/>
                        <Button variant="outline-secondary" onClick={() => setQuantity(quantity + 1)}>+</Button>
                    </InputGroup>
                ) : (
                    <ButtonComponent onClick={handleBuy} disabled={disableBuyButton}>Buy</ButtonComponent>
                )}
                {isInCart &&
                    <ButtonComponent onClick={handleRemoveFromBasket} disabled={disableBuyButton}>Remove from
                        basket</ButtonComponent>}
                <hr/>
            </div>
            <h2>Similar Products</h2>
            <Container>
                <ProductsList products={similarProducts}/>
            </Container>
        </div>
    );
};

export default ProductPage;