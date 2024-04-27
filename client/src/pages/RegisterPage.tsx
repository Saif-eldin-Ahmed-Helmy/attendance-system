import React, { useState } from 'react';
import {Form, Button, Alert, InputGroup} from 'react-bootstrap';
import {useNavigate} from "react-router-dom";
import ButtonComponent from "../components/Button/Button.tsx";

const RegisterPage: React.FC = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [gender, setGender] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!firstName || !lastName || !email || !password || !confirmPassword || !gender || !dateOfBirth) {
            setError('All fields are required');
            return;
        }

        if (!/\S+@\S+\.\S+/.test(email)) {
            setError('Email is not valid');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        /*if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/.test(password)) {
            setError('Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, and one number');
            return;
        }*/

        const name = firstName.trim().charAt(0).toUpperCase() + firstName.trim().slice(1) + ' '
            + lastName.trim().charAt(0).toUpperCase() + lastName.trim().slice(1);
        const response = await fetch('http://localhost:3001/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, gender, dateOfBirth })
        });

        const data = await response.json();

        if (data.error) {
            setError(data.error);
        } else {
            navigate('/');
        }
    };

    const handleGoogleLogin = () => {
        window.location.href = 'http://localhost:3001/api/users/google';
    };

    return (
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
            <Form style={{width: '50%'}} onSubmit={handleSubmit}>
                {error && <Alert variant="danger">{error}</Alert>}
                <Button variant="primary" onClick={handleGoogleLogin} style={{marginBottom: 20, color:'black', backgroundColor: '#f5f5f5', borderColor: 'black', fontFamily: "sans-serif", fontWeight: 5000}}>
                    <img src="/google_logo.webp" alt="Google logo" style={{width: '20px', marginRight: '10px'}} />
                    Continue with Google
                </Button>
                <div className="line" style={{position: 'relative', height: '1px', width: '100%', backgroundColor: 'rgb(224, 224, 224)', marginTop: 10, fontFamily: "sans-serif"}}>
                    <span style={{backgroundColor: "#f5f5f5", padding: 15, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)'}}>
                        OR
                    </span>
                </div>
                <Form.Group style={{marginTop: 25}} controlId="formFirstName">
                    <Form.Label>First Name</Form.Label>
                    <Form.Control type="text" value={firstName} onChange={e => setFirstName(e.target.value)} />
                </Form.Group>
                <Form.Group controlId="formLastName">
                    <Form.Label>Last Name</Form.Label>
                    <Form.Control type="text" value={lastName} onChange={e => setLastName(e.target.value)} />
                </Form.Group>
                <Form.Group controlId="formEmail">
                    <Form.Label>Email</Form.Label>
                    <Form.Control type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </Form.Group>
                <Form.Group controlId="formPassword">
                    <Form.Label>Password</Form.Label>
                    <InputGroup>
                        <Form.Control type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} />
                        <InputGroup.Text>
                            <Button variant="outline-secondary" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</Button>
                        </InputGroup.Text>
                    </InputGroup>
                </Form.Group>
                <Form.Group controlId="formConfirmPassword">
                    <Form.Label>Confirm Password</Form.Label>
                    <Form.Control type={showPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </Form.Group>
                <Form.Group controlId="formGender">
                    <Form.Label>Gender</Form.Label>
                    <Form.Control as="select" value={gender} onChange={e => setGender(e.target.value)}>
                        <option value="">Select...</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                    </Form.Control>
                </Form.Group>
                <Form.Group style={{marginBottom: 10}} controlId="formDateOfBirth">
                    <Form.Label>Date of Birth</Form.Label>
                    <Form.Control type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
                </Form.Group>
                <Button variant="primary" type="submit">Register</Button>
            </Form>
        </div>
    );
};

export default RegisterPage;