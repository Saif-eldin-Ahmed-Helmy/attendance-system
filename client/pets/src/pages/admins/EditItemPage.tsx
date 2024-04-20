import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {Form, Spinner} from 'react-bootstrap';
import CheckboxComponent from "../../components/Checkbox/Checkbox.tsx";
import ButtonComponent from "../../components/Button/Button.tsx";
import {Item} from "../../interfaces/item.ts";

const EditItemPage: React.FC = () => {
    const { itemId } = useParams();
    const [item, setItem] = useState<Item | null>(null);
    const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        fetchItem();
    }, [itemId]);

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
        if (item) {
            setItem({ ...item, picture: data.url });
        }
    };

    const fetchItem = async () => {
        const response = await fetch(`http://localhost:3001/api/items?deleted=true&itemId=${itemId}`, {
            credentials: 'include'
        });
        const data = await response.json();
        setItem({ ...data.items[0], oldItemId: itemId });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (item) {
            setFormErrors({});
            if (!item.itemId) {
                setFormErrors(errors => ({ ...errors, itemId: 'Item ID is required' }));
                return;
            }
            if (!item.name) {
                setFormErrors(errors => ({ ...errors, name: 'Name is required' }));
                return;
            }
            if (!item.picture) {
                setFormErrors(errors => ({ ...errors, picture: 'Picture is required' }));
                return;
            }
            if (item.stock < 0) {
                setFormErrors(errors => ({ ...errors, stock: 'Stock cannot be below 0' }));
                return;
            }
            if (item.price < 0) {
                setFormErrors(errors => ({ ...errors, price: 'Price cannot be below 0' }));
                return;
            }
            if (!item.description) {
                setFormErrors(errors => ({ ...errors, description: 'Description is required' }));
                return;
            }
            if (!item.category) {
                setFormErrors(errors => ({ ...errors, category: 'Category is required' }));
                return;
            }
            if (!item.subCategory) {
                setFormErrors(errors => ({ ...errors, subCategory: 'Sub Category is required' }));
                return;
            }
            const response = await fetch(`http://localhost:3001/api/items/`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });

            if (response.ok) {
                alert('Item updated successfully');
            } else {
                alert('Error updating item');
            }
        }
    };

    if (!item) {
        return <div style={{marginTop: 150}}>
            <p>Loading... </p>
            <Spinner animation="grow"/>
        </div>
    }

    const handleCheckboxChange = (checked: boolean) => {
        if (item) {
            setItem({ ...item, deleted: checked });
        }
    };

    return (
        <Form style={{marginTop: 150}} onSubmit={handleSubmit}>
            <a href="/admin/items">
                <ButtonComponent>
                    Go Back
                </ButtonComponent>
            </a>
            <p>

            </p>
            <Form.Group controlId="formId">
                <Form.Label>Item Id</Form.Label>
                <Form.Control type="text" value={item.itemId} onChange={e => setItem({ ...item, itemId: e.target.value })} isInvalid={!!formErrors.itemId} />
                <Form.Control.Feedback type="invalid">{formErrors.itemId}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="formName">
                <Form.Label>Name</Form.Label>
                <Form.Control type="text" value={item.name} onChange={e => setItem({ ...item, name: e.target.value })} isInvalid={!!formErrors.name} />
                <Form.Control.Feedback type="invalid">{formErrors.name}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="formPicture">
                <Form.Label>Picture</Form.Label>
                <Form.Control type="text" value={item.picture} onChange={e => setItem({ ...item, picture: e.target.value })} isInvalid={!!formErrors.picture} />
                <Form.Control.Feedback type="invalid">{formErrors.picture}</Form.Control.Feedback>
                <Form.Control type="file" onChange={handleFileChange} />
            </Form.Group>
            <Form.Group controlId="formStock">
                <Form.Label>Stock</Form.Label>
                <Form.Control type="number" value={item.stock} onChange={e => setItem({ ...item, stock: parseInt(e.target.value) })} isInvalid={!!formErrors.stock} />
                <Form.Control.Feedback type="invalid">{formErrors.stock}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="formPrice">
                <Form.Label>Price</Form.Label>
                <Form.Control type="number" value={item.price} onChange={e => setItem({ ...item, price: parseFloat(e.target.value) })} isInvalid={!!formErrors.price} />
                <Form.Control.Feedback type="invalid">{formErrors.price}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="formDescription">
                <Form.Label>Description</Form.Label>
                <Form.Control type="text" value={item.description} onChange={e => setItem({ ...item, description: e.target.value })} isInvalid={!!formErrors.description} />
                <Form.Control.Feedback type="invalid">{formErrors.description}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="formCategory">
                <Form.Label>Category</Form.Label>
                <Form.Control as="select" value={item.category} onChange={e => setItem({ ...item, category: e.target.value })} isInvalid={!!formErrors.category}>
                    <option value="">Select...</option>
                    <option value="cats">Cats</option>
                    <option value="dogs">Dogs</option>
                </Form.Control>
                <Form.Control.Feedback type="invalid">{formErrors.category}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="formSubCategory">
                <Form.Label>Sub Category</Form.Label>
                <Form.Control as="select" value={item.subCategory} onChange={e => setItem({ ...item, subCategory: e.target.value })} isInvalid={!!formErrors.subCategory}>
                    <option value="">Select...</option>
                    <option value="food">Food</option>
                    <option value="accessories">Accessories</option>
                </Form.Control>
                <Form.Control.Feedback type="invalid">{formErrors.subCategory}</Form.Control.Feedback>
            </Form.Group>
            <div style={{marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <p>Deleted</p>
                <CheckboxComponent onCheckboxChange={handleCheckboxChange} checked={item.deleted} />
            </div>
            <ButtonComponent variant="primary" type="submit">Update Item</ButtonComponent>
        </Form>
    );
};

export default EditItemPage;