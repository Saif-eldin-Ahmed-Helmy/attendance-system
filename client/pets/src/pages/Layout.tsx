import React from 'react';
import NavbarComponent from "../components/Navbar/Navbar.tsx";
import {Outlet} from "react-router-dom";
import Container from "react-bootstrap/Container";

const Layout: React.FC = () => {
    return (
        <Container className='bg-blue-50 min-h-screen flex flex-col justify-between'>
            <NavbarComponent
                brand={{href: "/", label: "Whisker", logo: "/logo.png"}}
                links={[
                    {href: "/", label: "HOME"},
                ]}
                dropdown={[
                    {
                        title: "CATS",
                        items: [
                            {href: "/shop?category=cats", label: "All"},
                            {href: "/shop?category=cats&subCategory=food", label: "Cat Food"},
                            {href: "/shop?category=cats&subCategory=accessories", label: "Cat Accessories"},
                        ],
                    },
                    {
                        title: "DOGS",
                        items: [
                            {href: "/shop?category=dogs", label: "All"},
                            {href: "/shop?category=dogs&subCategory=food", label: "Dog Food"},
                            {href: "/shop?category=dogs&subCategory=accessories", label: "Dog Accessories"},
                        ],
                    }
                ]}
            />
            <Outlet/>
        </Container>
    );
};

export default Layout;