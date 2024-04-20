import React, { useState, useEffect } from 'react';
import ProductCard from '../ProductCard/ProductCard';
import { Item } from "../../interfaces/item.ts";
import {Col, Row} from "react-bootstrap";
import {toast, ToastContainer} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ProductsListProps {
    products: Item[];
    enableBuy?: boolean;
    enableFavorite?: boolean;
    href?: string;
}

const ProductsList: React.FC<ProductsListProps> = ({ products, enableBuy = true, enableFavorite = true, href = "/product" }) => {
    const [favoriteItems, setFavoriteItems] = useState<string[]>([]);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);


    useEffect(() => {
        const checkAuthentication = async () => {
            const response = await fetch('http://localhost:3001/api/users/session', {
                credentials: 'include'
            });
            const data = await response.json();
            setIsAuthenticated(data.isAuthenticated)
        };

        checkAuthentication();
    }, []);

    useEffect(() => {
        fetch('http://localhost:3001/api/users/favorites', {
            credentials: 'include',
        })
            .then(response => response.json())
            .then(data => setFavoriteItems(data.favorites));
    }, []);

    const toggleFavorite = (itemId: string) => {
        if (!isAuthenticated) {
            toast.error('You must be logged in to favorite items!', {
                position: toast.POSITION.BOTTOM_RIGHT,
                autoClose: 2000
            });
            return;
        }
        setFavoriteItems(prevFavorites => {
            if (prevFavorites.includes(itemId)) {
                toast.success('Item removed from favorites!', {
                    position: toast.POSITION.BOTTOM_RIGHT,
                    autoClose: 2000
                });
                return prevFavorites.filter(favoriteId => favoriteId !== itemId);
            } else {
                toast.success('Item added to favorites!', {
                    position: toast.POSITION.BOTTOM_RIGHT,
                    autoClose: 2000
                });
                return [...prevFavorites, itemId];
            }
        });

        fetch('http://localhost:3001/api/users/favorites', {
            credentials: 'include',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({itemId}),
        })
            .then(response => response.json())
            .then(data => {
                setFavoriteItems(data.favorites);
            })
            .catch(() => {
                setFavoriteItems(prevFavorites => {
                    if (prevFavorites.includes(itemId)) {
                        return prevFavorites.filter(favoriteId => favoriteId !== itemId);
                    } else {
                        return [...prevFavorites, itemId];
                    }
                });
            });
    };

    return (
        <>
            <ToastContainer/>
            <Row>
                {products.map(product => (
                    <Col sm={12} md={6} lg={4} xl={3}>
                        <ProductCard
                            key={product.itemId}
                            product={product}
                            isFavorited={favoriteItems && favoriteItems.includes(product.itemId)}
                            toggleFavorite={() => toggleFavorite(product.itemId)}
                            href={`${href}/${product.itemId}`}
                            enableBuy={enableBuy}
                            enableFavorite={enableFavorite}
                        />
                    </Col>
                ))}
            </Row>
        </>
    );
};

export default ProductsList;