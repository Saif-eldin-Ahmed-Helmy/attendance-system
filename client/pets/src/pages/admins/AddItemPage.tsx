import React, { useState } from 'react';
import { Form } from 'react-bootstrap';
import ButtonComponent from "../../components/Button/Button.tsx";
import CheckboxComponent from "../../components/Checkbox/Checkbox.tsx";

const AddItemPage: React.FC = () => {
    const [itemId, setItemId] = useState('');
    const [name, setName] = useState('');
    const [picture, setPicture] = useState('');
    const [stock, setStock] = useState(0);
    const [price, setPrice] = useState(0);
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('cats');
    const [subCategory, setSubCategory] = useState('food');
    const [deleted, setDeleted] = useState(false);
    const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setFormErrors({});
        if (!itemId) {
            setFormErrors(errors => ({ ...errors, itemId: 'Item ID is required' }));
            return;
        }
        if (!name) {
            setFormErrors(errors => ({ ...errors, name: 'Name is required' }));
            return;
        }
        if (!picture) {
            setFormErrors(errors => ({ ...errors, picture: 'Picture is required' }));
            return;
        }
        if (stock < 0) {
            setFormErrors(errors => ({ ...errors, stock: 'Stock cannot be below 0' }));
            return;
        }
        if (price < 0) {
            setFormErrors(errors => ({ ...errors, price: 'Price cannot be below 0' }));
            return;
        }
        if (!description) {
            setFormErrors(errors => ({ ...errors, description: 'Description is required' }));
            return;
        }
        if (!category) {
            setFormErrors(errors => ({ ...errors, category: 'Category is required' }));
            return;
        }
        if (!subCategory) {
            setFormErrors(errors => ({ ...errors, subCategory: 'Sub Category is required' }));
            return;
        }

        const item = { itemId, name, picture, stock, price, description, category, subCategory, deleted };
        const response = await fetch('http://localhost:3001/api/items', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });

        if (response.ok) {
            alert('Item added successfully');
        } else {
            alert('Error adding item');
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) {
            return;
        }
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('http://localhost:3001/api/images/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        setPicture(data.url);
    };

    return (
        <Form style={{marginTop: 130}} onSubmit={handleSubmit}>
            <a href="/admin/items">
                <ButtonComponent>
                    Go Back
                </ButtonComponent>
            </a>
            <p>

            </p>
            <Form.Group controlId="formItemId">
                <Form.Label>Item ID</Form.Label>
                <Form.Control type="text" value={itemId} onChange={e => setItemId(e.target.value)} isInvalid={!!formErrors.itemId} />
                <Form.Control.Feedback type="invalid">{formErrors.itemId}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="formName">
                <Form.Label>Name</Form.Label>
                <Form.Control type="text" value={name} onChange={e => {
                    setName(e.target.value);
                    setItemId(e.target.value.toLowerCase().replace(/ /g, '-'));
                }} isInvalid={!!formErrors.name} />
                <Form.Control.Feedback type="invalid">{formErrors.name}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="formPicture">
                <Form.Label>Picture</Form.Label>
                <Form.Control type="text" value={picture} onChange={e => setPicture(e.target.value)} isInvalid={!!formErrors.picture} />
                <Form.Control.Feedback type="invalid">{formErrors.picture}</Form.Control.Feedback>
                <Form.Control type="file" onChange={handleFileChange} />
            </Form.Group>
            <Form.Group controlId="formStock">
                <Form.Label>Stock</Form.Label>
                <Form.Control type="number" value={stock} onChange={e => setStock(parseInt(e.target.value))} isInvalid={!!formErrors.stock} />
                <Form.Control.Feedback type="invalid">{formErrors.stock}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="formPrice">
                <Form.Label>Price</Form.Label>
                <Form.Control type="number" value={price} onChange={e => setPrice(parseFloat(e.target.value))} isInvalid={!!formErrors.price} />
                <Form.Control.Feedback type="invalid">{formErrors.price}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="formDescription">
                <Form.Label>Description</Form.Label>
                <Form.Control type="text" value={description} onChange={e => setDescription(e.target.value)} isInvalid={!!formErrors.description} />
                <Form.Control.Feedback type="invalid">{formErrors.description}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="formCategory">
                <Form.Label>Category</Form.Label>
                <Form.Control as="select" value={category} onChange={e => setCategory(e.target.value)} isInvalid={!!formErrors.category}>
                    <option value="">Select...</option>
                    <option value="cats">Cats</option>
                    <option value="dogs">Dogs</option>
                </Form.Control>
                <Form.Control.Feedback type="invalid">{formErrors.category}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="formSubCategory">
                <Form.Label>Sub Category</Form.Label>
                <Form.Control as="select" value={subCategory} onChange={e => setSubCategory(e.target.value)} isInvalid={!!formErrors.subCategory}>
                    <option value="">Select...</option>
                    <option value="food">Food</option>
                    <option value="accessories">Accessories</option>
                </Form.Control>
                <Form.Control.Feedback type="invalid">{formErrors.subCategory}</Form.Control.Feedback>
            </Form.Group>
            <div style={{marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <p>Deleted</p>
                <CheckboxComponent onCheckboxChange={setDeleted} checked={deleted} />
            </div>
            <ButtonComponent variant="primary" type="submit">Add Item</ButtonComponent>
        </Form>
    );
};

export default AddItemPage;