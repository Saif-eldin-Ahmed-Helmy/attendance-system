import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {Form, Spinner} from 'react-bootstrap';
import ButtonComponent from "../components/Button/Button.tsx";
import { Location } from '../interfaces/location.ts';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const EditLocationPage: React.FC = () => {
    const { locationId } = useParams();
    const [location, setLocation] = useState<Location | null>(null);
    const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
    const [mapPosition, setMapPosition] = useState({ lat: 0, lng: 0 });

    useEffect(() => {
        fetchLocation();
    }, [locationId]);

    const fetchLocation = async () => {
        const response = await fetch(`http://localhost:3001/api/users/locations?locationId=${locationId}`, {
            credentials: 'include'
        });
        const data = await response.json();
        data.locationId = data.locationId.split(' ')
            .map((s: string) => s.charAt(0).toUpperCase() + s.substring(1))
            .join(' ');
        setLocation(data);
        setMapPosition({ lat: data.latitude, lng: data.longitude });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (location) {
            location.oldLocationId = locationId || location.locationId;
            setFormErrors({});
            const response = await fetch(`http://localhost:3001/api/users/locations`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...location, latitude: mapPosition.lat, longitude: mapPosition.lng })
            });

            if (response.ok) {
                alert('Location updated successfully');
            } else {
                alert('Error updating location');
            }
        }
    };

    if (!location) {
        return <div style={{marginTop: 150}}>
            <p>Loading... </p>
            <Spinner animation="grow"/>
        </div>
    }

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
                <Form.Control type="text" value={location.locationId} onChange={e => setLocation({ ...location, locationId: e.target.value })} isInvalid={!!formErrors.locationId} />
                <Form.Control.Feedback type="invalid">{formErrors.locationId}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="formApartmentNumber">
                <Form.Label>Apartment Number</Form.Label>
                <Form.Control type="text" value={location.apartmentNumber} onChange={e => setLocation({ ...location, apartmentNumber: e.target.value })} isInvalid={!!formErrors.apartmentNumber} />
                <Form.Control.Feedback type="invalid">{formErrors.apartmentNumber}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="formFloorNumber">
                <Form.Label>Floor Number</Form.Label>
                <Form.Control type="number" value={location.floorNumber} onChange={e => setLocation({ ...location, floorNumber: parseInt(e.target.value) })} isInvalid={!!formErrors.floorNumber} />
                <Form.Control.Feedback type="invalid">{formErrors.floorNumber}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="formStreetName">
                <Form.Label>Street Name</Form.Label>
                <Form.Control type="text" value={location.streetName} onChange={e => setLocation({ ...location, streetName: e.target.value })} isInvalid={!!formErrors.streetName} />
                <Form.Control.Feedback type="invalid">{formErrors.streetName}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="formCity">
                <Form.Label>City</Form.Label>
                <Form.Control type="text" value={location.city} onChange={e => setLocation({ ...location, city: e.target.value })} isInvalid={!!formErrors.city} />
                <Form.Control.Feedback type="invalid">{formErrors.city}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="formPhoneNumber">
                <Form.Label>Phone Number</Form.Label>
                <Form.Control type="text" value={location.phoneNumber} onChange={e => setLocation({ ...location, phoneNumber: e.target.value })} isInvalid={!!formErrors.phoneNumber} />
                <Form.Control.Feedback type="invalid">{formErrors.phoneNumber}</Form.Control.Feedback>
            </Form.Group>
            <LoadScript googleMapsApiKey="YOUR_GOOGLE_MAPS_API_KEY">
                <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '400px' }}
                    center={mapPosition}
                    zoom={10}
                    onClick={(e) => setMapPosition({  lat: e.latLng.lat(), lng: e.latLng.lng() })}
                >
                    <Marker position={mapPosition} />
                </GoogleMap>
            </LoadScript>
            <ButtonComponent variant="primary" type="submit">Update Location</ButtonComponent>
        </Form>
    );
};

export default EditLocationPage;