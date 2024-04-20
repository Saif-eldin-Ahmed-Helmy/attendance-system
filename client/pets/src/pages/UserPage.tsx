import React, {useContext, useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {Alert, Modal, Form, ButtonGroup, Button, Spinner} from "react-bootstrap";
import {
    FaHistory,
    FaStar,
    FaUserCog,
    FaLanguage,
    FaSignOutAlt,
    FaDollarSign,
    FaMoneyBill,
    FaMoneyBillAlt, FaWaveSquare, FaHandsWash, FaWallet, FaPeace
} from 'react-icons/fa';
import ButtonComponent from "../components/Button/Button.tsx";
import {toast, ToastContainer} from "react-toastify";
import {IoPersonSharp} from "react-icons/io5";

const UserPage: React.FC = () => {
    const navigate = useNavigate();
    const authContext = useContext(AuthContext);

    const email = authContext?.user?.email;
    const name = authContext?.user?.name;
    const preferredLanguage = authContext?.user?.preferredLanguage || 'en';

    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [language, setLanguage] = useState(preferredLanguage);
    const [balance, setBalance] = useState<number | null>(null);

    useEffect(() => {
        fetchBalance();
    }, []);

    const fetchBalance = async () => {
        const response = await fetch('http://localhost:3001/api/users/balance', {
            credentials: 'include'
        });
        const data = await response.json();
        setBalance(data.balance);
    };

    const handleLogout = async () => {
        const response = await fetch('http://localhost:3001/api/users/logout', {
            credentials: 'include'
        });
        const data = await response.json();
        if (data.error) {
            setError(data.error);
        }
        else {
            if (authContext) {
                authContext.setUser(null);
            }
            navigate('/');
        }
    };

    const handleLanguageChange = async () => {
        setShowModal(false);
        toast.success(`Language updated to ${language === 'ar' ? 'Arabic' : 'English'}`, {
            position: toast.POSITION.BOTTOM_RIGHT,
            autoClose: 2000
        });
        const result = await fetch('http://localhost:3001/api/users/language', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ language })
        });
        const data = await result.json();
        if (data.error) {
            setError(data.error);
        }
    };

    if (balance === null) {
        return <div style={{marginTop: 150}}>
            <p>Loading... </p>
            <Spinner animation="grow"/>
        </div>
    }

    return (
        <div style={{marginTop: 100}}>
            <ToastContainer/>
            {error && <Alert variant="danger">{error}</Alert>}
            <h1 style={{marginTop: 100}}>{name}</h1>
            <h3 style={{color: '#1dce3d'}}><FaWallet style={{marginBottom: 4}} /> Balance: {balance}</h3>
            <ButtonGroup style={{ margin: "20px" }}
                         vertical size="sm">
                <Button className='account-settings-btn' href="/user/orders" style={{color: "black"}}>
                    <FaHistory/> Orders History
                </Button>
                <Button className='account-settings-btn' href="/shop/favorites" style={{color: "black"}}>
                    <FaStar /> Favorites
                </Button>
                <Button className='account-settings-btn' href="/user/settings" style={{color: "black"}}>
                    <FaUserCog /> Account Settings
                </Button>
                <Button onClick={() => setShowModal(true)} className='account-settings-btn' style={{color: "black"}}>
                    <FaLanguage /> Language
                </Button>
                <Modal show={showModal} onHide={() => setShowModal(false)} centered className="language-modal">
                    <Modal.Header closeButton>
                        <Modal.Title>Change Language</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form.Check
                            type="radio"
                            id="english"
                            label="English"
                            checked={language === 'en'}
                            onChange={() => setLanguage('en')}
                        />
                        <Form.Check
                            type="radio"
                            id="arabic"
                            label="Arabic"
                            checked={language === 'ar'}
                            onChange={() => setLanguage('ar')}
                        />
                    </Modal.Body>
                    <Modal.Footer>
                        <ButtonComponent onClick={handleLanguageChange}>Update Language</ButtonComponent>
                    </Modal.Footer>
                </Modal>
                <Button onClick={handleLogout} className='account-settings-btn' style={{color: "black"}}>
                    <FaSignOutAlt /> Logout
                </Button>
            </ButtonGroup>
        </div>
    );
};

export default UserPage;