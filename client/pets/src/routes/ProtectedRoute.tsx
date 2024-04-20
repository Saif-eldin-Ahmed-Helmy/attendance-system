import { Outlet, Navigate } from 'react-router-dom'
import React, {useEffect, useState} from "react";
import {Spinner} from "react-bootstrap";
import {AuthContext} from "../context/AuthContext";

interface ProtectedRouteProps {
    role?: string;
    navigateTo?: string;
    isAuth?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ role = 'user', navigateTo = '/user', isAuth = true }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [user, setUser] = useState<any>(null);


    useEffect(() => {
        const checkAuthentication = async () => {
            const response = await fetch('http://localhost:3001/api/users/session', {
                credentials: 'include'
            });
            const data = await response.json();
            setIsAuthenticated(data.isAuthenticated && (role != 'user' ? (data.role == 'admin' || data.role === role) : true));
            setUser(data);
        };

        checkAuthentication();
    }, [role]);

    if (isAuthenticated === null) {
        return <div style={{marginTop: 150}}>
            <p>Loading... </p>
            <Spinner animation="grow"/>
        </div>
    }
    return(
        (isAuth ? isAuthenticated : !isAuthenticated) ?
            <AuthContext.Provider value={{ user, setUser }}>
                <Outlet/>
            </AuthContext.Provider>
            : <Navigate to={navigateTo}/>
    )
}

export default ProtectedRoute;