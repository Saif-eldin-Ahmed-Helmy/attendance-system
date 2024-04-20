import React, { useState } from 'react';
import {Form, Button, Alert} from 'react-bootstrap';
import ButtonComponent from "../components/Button/Button.tsx";
import {useNavigate} from "react-router-dom";

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        const response = await fetch(`http://localhost:3001/api/users?email=${email}&password=${password}`, {
            credentials: 'include'
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
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '90vh'}}>
            <Form style={{width: '50%'}} onSubmit={handleLogin}>
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
                <Form.Group style={{marginTop: 25}} controlId="formEmail">
                    <Form.Label>Email</Form.Label>
                    <Form.Control style={{width: '100%'}} type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </Form.Group>
                <Form.Group style={{marginBottom: 10}} controlId="formPassword">
                    <Form.Label>Password</Form.Label>
                    <Form.Control style={{width: '100%'}} type="password" value={password} onChange={e => setPassword(e.target.value)} />
                </Form.Group>
                <ButtonComponent variant="primary" type="submit">Sign in</ButtonComponent>
                <div style={{marginTop: 10}}>
                    <a href={'/register'} style={{color: "gray"}}>Don't have an account? </a>
                    <a href={'/register'} style={{color: "orange"}}>Create an account</a>
                </div>

            </Form>
        </div>
    );
};

export default LoginPage;