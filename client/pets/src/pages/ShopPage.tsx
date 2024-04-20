import React, { useState, useEffect } from 'react';
import Container from "react-bootstrap/Container";
import {Form, FormControl, DropdownButton, Dropdown, Spinner, InputGroup, Button} from "react-bootstrap";
import './ShopPage.css';
import { useLocation } from 'react-router-dom';
import CheckboxComponent from "../components/Checkbox/Checkbox.tsx";
import {Item} from "../interfaces/item.ts";
import ProductsList from "../components/ProductsList/ProductsList.tsx";
import {BsSearch} from "react-icons/bs";

const useQuery = () => {
    return new URLSearchParams(useLocation().search);
}

const ShopPage: React.FC = () => {
    const [page, setPage] = useState(1);
    const [maxPage, setMaxPage] = useState(1);
    const [products, setProducts] = useState<Item[] | null>(null);
    const [showOutOfStock, setShowOutOfStock] = useState(true);
    const [minPrice, setMinPrice] = useState(0);
    const [maxPrice, setMaxPrice] = useState(0);
    const [limit, setLimit] = useState(12);
    const query = useQuery();
    const category = query.get('category');
    const subCategory = query.get('subCategory');
    const [categoryState, setCategoryState] = useState(category || '');
    const [subCategoryState, setSubCategoryState] = useState(subCategory || '');
    const showFilters = true;
    const [searchTerm, setSearchTerm] = useState('');

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    useEffect(() => {
        fetchProducts();
    }, [showOutOfStock, minPrice, maxPrice, limit, categoryState, subCategoryState, page]);

    const fetchProducts = async () => {
        const response = await fetch(`http://localhost:3001/api/items?priceMin=${minPrice}${!showOutOfStock ? "&inStock=true" : ""}&priceMax=${maxPrice <= 0 ? 1000000 : maxPrice}&limit=${limit}&page=${page}&category=${categoryState}&subCategory=${subCategoryState}`);
        const data = await response.json();
        setProducts(data.items);
        setMaxPage(data.maxPages);
    };

    if (!products) {
        return <div style={{marginTop: 150}}>
            <p>Loading... </p>
            <Spinner animation="grow"/>
        </div>
    }

    let filteredProducts = products;

    if (searchTerm) {
        filteredProducts = products.filter(product => {
            const productWords = product.name.toLowerCase().split(' ');
            const searchWords = searchTerm.toLowerCase().split(' ');
            return searchWords.some(word => productWords.some(productWord => productWord.indexOf(word) !== -1));
        });

        filteredProducts.sort((a, b) => {
            const aWords = a.name.toLowerCase().split(' ');
            const bWords = b.name.toLowerCase().split(' ');
            const searchWords = searchTerm.toLowerCase().split(' ');

            const aScore = aWords.reduce((score, word) => score + (searchWords.some(searchWord => word.indexOf(searchWord) !== -1) ? 1 : 0), 0);
            const bScore = bWords.reduce((score, word) => score + (searchWords.some(searchWord => word.indexOf(searchWord) !== -1) ? 1 : 0), 0);

            return bScore - aScore;
        });
    }

    return (
        <div>
            <Container className="shop-menu" style={{marginTop: 150}}>
                <Container className="shop-menu-container">
                    <h2 className="shop-menu-subhead">
                        <p>
                            {categoryState === 'cats' ? 'FOR CATS' : categoryState === 'dogs' ? 'FOR DOGS' : 'FOR YOUR PET'}
                        </p>
                    </h2>
                    <h2 className="shop-menu-description" style={{fontSize: 20, fontFamily: "sans-serif"}}>
                        <p>Make your pet happy!</p>
                    </h2>
                    <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                        <Form className="filter-form"
                              style={{
                                  backgroundColor: "#f5f5f5",
                                  width: '100%',
                                  display: showFilters ? 'flex' : 'none'
                              }}>
                            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                                <p>In Stock</p>
                                <CheckboxComponent onCheckboxChange={setShowOutOfStock}/>
                            </div>
                            <Form.Group style={{marginLeft: 10, width: '10%'}} controlId="formMinPrice">
                                <Form.Label>Min Price</Form.Label>
                                <FormControl type="number" value={minPrice}
                                             onChange={e => setMinPrice(e.target.value ? parseFloat(e.target.value) : 0)}/>
                            </Form.Group>
                            <Form.Group style={{marginLeft: 10, width: '10%'}} controlId="formMaxPrice">
                                <Form.Label>Max Price</Form.Label>
                                <FormControl type="number" value={maxPrice}
                                             onChange={e => setMaxPrice(e.target.value ? parseFloat(e.target.value) : 0)}/>
                            </Form.Group>
                            <Form.Group style={{marginLeft: 10, width: '5%'}} controlId="formLimit">
                                <Form.Label>Limit</Form.Label>
                                <FormControl type="number" value={limit}
                                             onChange={e => setLimit(e.target.value ? parseInt(e.target.value) : 0)}/>
                            </Form.Group>
                            <div style={{
                                marginLeft: 20,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}>
                                <p>Category</p>
                                <DropdownButton
                                    style={{top: -10}}
                                    id="dropdown-basic-button"
                                    title={categoryState === '' ? 'All' : categoryState === 'cats' ? 'Cats' : 'Dogs'}
                                    onSelect={(selectedKey: any) => setCategoryState(selectedKey)}
                                >
                                    <Dropdown.Item eventKey="">All</Dropdown.Item>
                                    <Dropdown.Item eventKey="cats">Cats</Dropdown.Item>
                                    <Dropdown.Item eventKey="dogs">Dogs</Dropdown.Item>
                                </DropdownButton>
                            </div>


                            <div style={{
                                marginLeft: 20,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}>
                                <p>Sub Category</p>
                                <DropdownButton
                                    style={{top: -10}}
                                    id="dropdown-basic-button"
                                    title={subCategoryState === '' ? 'All' : subCategoryState === 'food' ? 'Food' : 'Accessories'}
                                    onSelect={(selectedKey: any) => setSubCategoryState(selectedKey)}
                                >
                                    <Dropdown.Item eventKey="">All</Dropdown.Item>
                                    <Dropdown.Item eventKey="food">Food</Dropdown.Item>
                                    <Dropdown.Item eventKey="accessories">Accessories</Dropdown.Item>
                                </DropdownButton>
                            </div>


                            <div style={{
                                marginLeft: 20,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}>
                                <p>Page</p>
                                <DropdownButton
                                    style={{top: -10}}
                                    id="dropdown-basic-button"
                                    title={page}
                                    onSelect={(selectedKey: any) => setPage(selectedKey)}
                                >
                                    {maxPage > 0 && [...Array(maxPage).keys()].map(i => (
                                        <Dropdown.Item eventKey={i + 1}>{i + 1}</Dropdown.Item>
                                    ))}
                                </DropdownButton>
                            </div>
                            <Form.Group controlId="formSearch">
                                <InputGroup className="mb-3">
                                    <Form.Label>Search for a product</Form.Label>
                                    <InputGroup>
                                        <FormControl
                                            placeholder="Search"
                                            aria-label="Search"
                                            aria-describedby="basic-addon2"
                                            value={searchTerm}
                                            onChange={handleSearchChange}
                                        />
                                        <InputGroup.Text id="basic-addon2">
                                            <BsSearch/>
                                        </InputGroup.Text>
                                    </InputGroup>
                                </InputGroup>
                            </Form.Group>
                        </Form>
                    </div>
                    <Container>
                        <ProductsList products={filteredProducts}>
                        </ProductsList>
                    </Container>
                </Container>
            </Container>
        </div>
    );
};

export default ShopPage;