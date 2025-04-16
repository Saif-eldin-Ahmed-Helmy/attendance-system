import {SetStateAction, useEffect, useState} from 'react';
import './Navbar.css';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import {FaTwitter, FaFacebook, FaInstagram} from 'react-icons/fa';
import logo from '../../../public/logo.png';

export const NavbarComponent = () => {

    const [activeLink, setActiveLink] = useState('home');
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => {
            if (window.scrollY > 50) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        }

        window.addEventListener("scroll", onScroll);

        return () => window.removeEventListener("scroll", onScroll);
    }, [])

    const onUpdateActiveLink = (value: SetStateAction<string>) => {
        setActiveLink(value);
    }

    return (
        <Navbar expand="md" className={scrolled ? "scrolled" : ""}>
            <Container>
                <Navbar.Brand href="/">
                    <img src={logo} alt="Logo"/>
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav">
                    <span className="navbar-toggler-icon"></span>
                </Navbar.Toggle>
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="ms-auto">
                        <Nav.Link href="/subjects" className={activeLink === 'subjects' ? 'active navbar-link' : 'navbar-link'}
                                  onClick={() => onUpdateActiveLink('subjects')}>Subjects</Nav.Link>
                        <Nav.Link href="/students"
                                  className={activeLink === 'students' ? 'active navbar-link' : 'navbar-link'}
                                  onClick={() => onUpdateActiveLink('students')}>Students</Nav.Link>
                        <Nav.Link href="/teachers"
                                  className={activeLink === 'teachers' ? 'active navbar-link' : 'navbar-link'}
                                  onClick={() => onUpdateActiveLink('teachers')}>Teachers</Nav.Link>
                        <Nav.Link href="/announcements" className={activeLink === 'announcements' ? 'active navbar-link' : 'navbar-link'}
                                  onClick={() => onUpdateActiveLink('announcements')}>Announcements</Nav.Link>
                    </Nav>
                    <span className="navbar-text">
                        <div className="social-icon">
                            <a href="https://twitter.com/futureacademyeg"><FaTwitter color="black"/></a>
                            <a href="https://www.facebook.com/futureacademyeg"><FaFacebook color="black"/></a>
                            <a href="https://www.instagram.com/futureacademyegypt/"><FaInstagram color="black"/></a>
                        </div>
                    </span>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    )
}

export default NavbarComponent;