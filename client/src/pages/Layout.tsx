import React from 'react';
import NavbarComponent from "../components/Navbar/Navbar.tsx";
import {Outlet} from "react-router-dom";
import Container from "react-bootstrap/Container";

const Layout: React.FC = () => {
    return (
        <Container className='bg-blue-50 min-h-screen flex flex-col justify-between'>
            <NavbarComponent
            />
            <Outlet/>
        </Container>
    );
};

export default Layout;