import React, { useState } from 'react';
import { Form } from 'react-bootstrap';
import ButtonComponent from "../components/Button/Button.tsx";

const AddLocationPage: React.FC = () => {
    const [locationId, setLocationId] = useState('');
    const [locationSignature, setLocationSignature] = useState('');
    const [apartmentNumber, setApartmentNumber] = useState('');
    const [floorNumber, setFloorNumber] = useState(0);
    const [streetName, setStreetName] = useState('');
    const [city, setCity] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setFormErrors({});
        const response = await fetch(`http://localhost:3001/api/users/locations`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locationId, locationSignature, apartmentNumber, floorNumber, streetName, city, phoneNumber })
        });

        if (response.ok) {
            alert('Location added successfully');
        } else {
            alert('Error adding location');
        }
    };

    return (
        <Form style={{marginTop: 150}} onSubmit={handleSubmit}>
            <a href="/user/settings">
                <ButtonComponent>
                    Go Back
                </ButtonComponent>
            </a>
            <p>

            </p>
            <Form.Group controlId="formLocationId">
                <Form.Label>Location Name</Form.Label>
                <Form.Control type="text" value={locationId} onChange={e => setLocationId(e.target.value)} isInvalid={!!formErrors.locationId} />
                <Form.Control.Feedback type="invalid">{formErrors.locationId}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="formApartmentNumber">
                <Form.Label>Apartment Number</Form.Label>
                <Form.Control type="text" value={apartmentNumber} onChange={e => setApartmentNumber(e.target.value)} isInvalid={!!formErrors.apartmentNumber} />
                <Form.Control.Feedback type="invalid">{formErrors.apartmentNumber}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="formFloorNumber">
                <Form.Label>Floor Number</Form.Label>
                <Form.Control type="number" value={floorNumber} onChange={e => setFloorNumber(parseInt(e.target.value))} isInvalid={!!formErrors.floorNumber} />
                <Form.Control.Feedback type="invalid">{formErrors.floorNumber}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="formStreetName">
                <Form.Label>Street Name</Form.Label>
                <Form.Control type="text" value={streetName} onChange={e => setStreetName(e.target.value)} isInvalid={!!formErrors.streetName} />
                <Form.Control.Feedback type="invalid">{formErrors.streetName}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="formCity">
                <Form.Label>City</Form.Label>
                <Form.Control type="text" value={city} onChange={e => setCity(e.target.value)} isInvalid={!!formErrors.city} />
                <Form.Control.Feedback type="invalid">{formErrors.city}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group style={{marginBottom: 10}} controlId="formPhoneNumber">
                <Form.Label>Phone Number</Form.Label>
                <Form.Control type="text" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} isInvalid={!!formErrors.phoneNumber} />
                <Form.Control.Feedback type="invalid">{formErrors.phoneNumber}</Form.Control.Feedback>
            </Form.Group>
            <ButtonComponent variant="primary" type="submit">Add Location</ButtonComponent>
        </Form>
    );
};

export default AddLocationPage;