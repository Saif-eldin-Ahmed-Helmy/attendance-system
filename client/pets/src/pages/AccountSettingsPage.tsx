import React, { useState, useEffect } from 'react';
import {Button, Alert, Form, Spinner} from 'react-bootstrap';
import {FaHome} from "react-icons/fa";

const AccountSettingsPage: React.FC = () => {
    const [locations, setLocations] = useState<[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        const response = await fetch('http://localhost:3001/api/users/locations', {
            credentials: 'include'
        });
        const data = await response.json();
        if (data.error) {
            setError(data.error);
        } else {
            setLocations(data);
        }
    };

    const handleDeleteLocation = async (locationId: string) => {
        const response = await fetch(`http://localhost:3001/api/users/locations?locationId=${locationId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const data = await response.json();
        if (data.error) {
            setError(data.error);
        } else {
            fetchLocations();
        }
    };

    const handleAddLocation = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const newLocation = Object.fromEntries(formData.entries());
        const response = await fetch('http://localhost:3001/api/users/locations', {
            method: 'POST',
            body: JSON.stringify(newLocation),
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        const data = await response.json();
        if (data.error) {
            setError(data.error);
        } else {
            fetchLocations();
        }
    };

    if (locations === null) {
        return <div style={{marginTop: 150}}>
            <p>Loading... </p>
            <Spinner animation="grow"/>
        </div>
    }

    return (
        <div>
            <h1 style={{marginTop: 100}}>Account Settings</h1>
            {error && <Alert variant="danger">{error}</Alert>}
            <h2>Locations</h2>
            {locations.length === 0 && <p>You don't have any locations saved<br/>Start by adding a location!</p>}
            {locations.map((location: any) => (
                <div key={location.locationId}>
                    <Button className='add-location-btn' href={`/user/edit-location/${location.locationId}`} style={{color: "black"}}>
                        <FaHome /> {location.locationId.split(' ')
                            .map((s: string) => s.charAt(0).toUpperCase() + s.substring(1))
                            .join(' ')}
                    </Button>
                </div>
            ))}
            <Form onSubmit={handleAddLocation}>
                <Button className='add-location-btn' href="/user/add-location" style={{color: "black"}}>
                    <FaHome /> Add Location
                </Button>
            </Form>
        </div>
    );
};

export default AccountSettingsPage;