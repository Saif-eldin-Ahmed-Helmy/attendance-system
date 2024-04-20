import React from 'react';
import './Navbar.css';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import { FaShoppingCart, FaUser, FaSearch } from 'react-icons/fa';

interface NavItem {
    href: string;
    label: string;
}

interface DropdownItem extends NavItem {
    divider?: boolean;
}

interface DropdownMenu {
    title: string;
    items: DropdownItem[];
}

interface NavbarProps {
    brand: { href: string; label: string; logo?: string };
    links: NavItem[];
    dropdown: DropdownMenu[];
}

const NavbarComponent: React.FC<NavbarProps> = ({ brand, links, dropdown }) => {
    return (
        <Navbar fixed="top" expand="lg" className="bg-body-tertiary">
            <Container>
                {brand.logo && <img className="logo" src={brand.logo} alt={brand.label}/>}
                <Navbar.Brand href={brand.href}>{brand.label}</Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav"/>
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="me-auto">
                        {links.map((link, index) => (
                            <Nav.Link key={index} href={link.href} className={`nav-link-${link.label.toLowerCase().replace(' ', '-')}`}>
                                {link.label}
                            </Nav.Link>
                        ))}
                        {dropdown.map((dropdown, index) => (
                            <NavDropdown key={index} title={dropdown.title} id="basic-nav-dropdown">
                                {dropdown.items.map((item, index) => (
                                    <React.Fragment key={index}>
                                        {item.divider && <NavDropdown.Divider/>}
                                        <NavDropdown.Item href={item.href}>
                                            {item.label}
                                        </NavDropdown.Item>
                                    </React.Fragment>
                                ))}
                            </NavDropdown>
                        ))}
                    </Nav>
                    <div>
                        <a href="/shop" className="icon">
                            <FaSearch/>
                        </a>
                        <a href="/cart" className="icon">
                            <FaShoppingCart/>
                        </a>
                        <a href="/user" className="icon">
                            <FaUser/>
                        </a>
                    </div>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default NavbarComponent;