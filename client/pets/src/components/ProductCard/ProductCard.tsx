import React from 'react';
import Card from 'react-bootstrap/Card';
import ButtonComponent from '../Button/Button';
import './ProductCard.css';
import { Item } from "../../interfaces/item.ts";

interface ProductComponentProps {
    product: Item;
    enableBuy?: boolean;
    enableFavorite?: boolean;
    isFavorited: boolean;
    toggleFavorite: () => void;
    href?: string;
}

const ProductCard: React.FC<ProductComponentProps> = ({
                                                          product,
                                                          isFavorited = false,
                                                          toggleFavorite = () => {},
                                                          enableBuy = true,
                                                          enableFavorite = true,
                                                          href = `/product/${product.itemId}`
                                                      }) => {
    return (
        <Card style={{ width: '18rem' }} className="product-card">
            <a href={href}>
                <div className="image-container">
                    <Card.Img variant="top" src={product.picture} />
                    <ButtonComponent className={product.stock > 0 ? 'buy-button' : 'buy-button-ofs'} onClick={() => {}}>{enableBuy ? (product.stock > 0 ? 'Buy' : 'Out of Stock') : 'Edit'}</ButtonComponent> {}
                </div>
            </a>
            <Card.Body className="product-card-body">
                <Card.Title className="product-description">{product.name}</Card.Title>
                <Card.Text style={{color: "gold"}}>
                    EGP {product.price.toFixed(2)}
                </Card.Text>
                {enableFavorite && <ButtonComponent variant="link" className={`favorite-button ${isFavorited ? 'heart-red' : 'heart-gray'}`} onClick={toggleFavorite}>
                    {isFavorited ? '❤️' : '🤍'}
                </ButtonComponent>}
            </Card.Body>
        </Card>
    );
};

export default ProductCard;