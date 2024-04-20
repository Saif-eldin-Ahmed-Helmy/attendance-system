import React, { useState, useEffect } from 'react';
import Container from "react-bootstrap/Container";
import {Row, Col, Form, FormControl, DropdownButton, Dropdown} from "react-bootstrap";
import ProductCard from '../../components/ProductCard/ProductCard';
import '../ShopPage.css';
import { useLocation } from 'react-router-dom';
import CheckboxComponent from "../../components/Checkbox/Checkbox.tsx";
import ButtonComponent from "../../components/Button/Button.tsx";
import {Item} from "../../interfaces/item.ts";

const useQuery = () => {
    return new URLSearchParams(useLocation().search);
}

const AdminItemsPage: React.FC = () => {
    const [products, setProducts] = useState<Item[]>([]);
    const [showOutOfStock, setShowOutOfStock] = useState(true);
    const [minPrice, setMinPrice] = useState(0);
    const [maxPrice, setMaxPrice] = useState(0);
    const query = useQuery();
    const category = query.get('category');
    const subCategory = query.get('subCategory');
    const [categoryState, setCategoryState] = useState(category || '');
    const [subCategoryState, setSubCategoryState] = useState(subCategory || '');
    const showFilters = true;
    const availableProducts = products.filter(product => !product.deleted && product.stock > 0);
    const outOfStockProducts = products.filter(product => !product.deleted && product.stock === 0);
    const deletedProducts = products.filter(product => product.deleted);

    useEffect(() => {
        fetchProducts();
    }, [showOutOfStock, minPrice, maxPrice, categoryState, subCategoryState]);

    const fetchProducts = async () => {
        const response = await fetch(`http://localhost:3001/api/items?deleted=true&priceMin=${minPrice}${!showOutOfStock ? "&inStock=true" : ""}&priceMax=${maxPrice <= 0 ? 1000000 : maxPrice}&category=${categoryState}&subCategory=${subCategoryState}`, {
            credentials: 'include'
        });
        const data = await response.json();
        setProducts(data.items);
    };

    //<Button variant="primary" onClick={() => setShowFilters(!showFilters)}>Toggle Filters</Button>

    return (
        <div>
            <Container className="shop-menu" style={{marginTop: 150}}>
                <Container className="shop-menu-container">
                    <h2 className="shop-menu-subhead">
                        <p>
                            {categoryState === 'cats' ? 'CATS' : categoryState === 'dogs' ? 'DOGS' : 'ALL'}
                        </p>
                    </h2>
                    <h2 className="shop-menu-description" style={{fontSize: 20, fontFamily: "sans-serif"}}>
                        <p>Products Listing</p>
                    </h2>
                    <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                        <Form className="filter-form" style={{backgroundColor: "#f5f5f5", width: '100%', display: showFilters ? 'flex' : 'none'}}>
                            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                                <p>In Stock</p>
                                <CheckboxComponent onCheckboxChange={setShowOutOfStock} />
                            </div>
                            <Form.Group style={{marginLeft: 10, width: '10%'}} controlId="formMinPrice">
                                <Form.Label>Min Price</Form.Label>
                                <FormControl type="number" value={minPrice} onChange={e => setMinPrice(e.target.value ? parseFloat(e.target.value) : 0)} />
                            </Form.Group>
                            <Form.Group style={{marginLeft: 10, width: '10%'}} controlId="formMaxPrice">
                                <Form.Label>Max Price</Form.Label>
                                <FormControl type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value ? parseFloat(e.target.value) : 0)} />
                            </Form.Group>
                            <div style={{marginLeft: 20, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                                <p>Category</p>
                                <DropdownButton
                                    style={{ top: -10 }}
                                    id="dropdown-basic-button"
                                    title={categoryState === '' ? 'All' : categoryState === 'cats' ? 'Cats' : 'Dogs'}
                                    onSelect={(selectedKey: any) => setCategoryState(selectedKey)}
                                >
                                    <Dropdown.Item eventKey="">All</Dropdown.Item>
                                    <Dropdown.Item eventKey="cats">Cats</Dropdown.Item>
                                    <Dropdown.Item eventKey="dogs">Dogs</Dropdown.Item>
                                </DropdownButton>
                            </div>


                            <div style={{marginLeft: 20, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                                <p>Sub Category</p>
                                <DropdownButton
                                    style={{ top: -10 }}
                                    id="dropdown-basic-button"
                                    title={subCategoryState === '' ? 'All' : subCategoryState === 'food' ? 'Food' : 'Accessories'}
                                    onSelect={(selectedKey: any) => setSubCategoryState(selectedKey)}
                                >
                                    <Dropdown.Item eventKey="">All</Dropdown.Item>
                                    <Dropdown.Item eventKey="food">Food</Dropdown.Item>
                                    <Dropdown.Item eventKey="accessories">Accessories</Dropdown.Item>
                                </DropdownButton>
                            </div>

                            <div style={{marginLeft: 300, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                                <p>Add Product</p>
                                <a href="/admin/add-item">
                                    <ButtonComponent>
                                        Add Item
                                    </ButtonComponent>
                                </a>
                            </div>
                        </Form>
                    </div>
                    {availableProducts.length > 0 && <p style={{fontSize: 50}}>Available Items</p>}
                    <Container>
                        <Row>
                            {availableProducts.map(product => (
                                <Col sm={12} md={6} lg={4} xl={3}>
                                    <ProductCard href={`/admin/edit-item/${product.itemId}`} product={product} enableBuy={false} enableFavorite={false} isFavorited={false}
                                                 toggleFavorite={() => {
                                                 }}/>
                                </Col>
                            ))}
                        </Row>
                    </Container>
                    {outOfStockProducts.length >0 && <p style={{fontSize: 50}}>Out Of Stock Items</p>}
                    <Container>
                        <Row>
                            {outOfStockProducts.map(product => (
                                <Col sm={12} md={6} lg={4} xl={3}>
                                    <ProductCard href={`/admin/edit-item/${product.itemId}`} product={product} enableBuy={false} enableFavorite={false} isFavorited={false}
                                                 toggleFavorite={() => {
                                                 }}/>
                                </Col>
                            ))}
                        </Row>
                    </Container>
                    {deletedProducts.length >0 && <p style={{fontSize: 50}}>Deleted Items</p>}
                    <Container>
                        <Row>
                            {deletedProducts.map(product => (
                                <Col sm={12} md={6} lg={4} xl={3}>
                                    <ProductCard href={`/admin/edit-item/${product.itemId}`} product={product} enableBuy={false} enableFavorite={false} isFavorited={false}
                                                 toggleFavorite={() => {
                                                 }}/>
                                </Col>
                            ))}
                        </Row>
                    </Container>
                </Container>
            </Container>
        </div>
    );
};

export default AdminItemsPage;