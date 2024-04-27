import React, { useEffect, useState } from 'react';
import StudentCard from '../components/StudentCard/StudentCard.tsx';
import {Form, Dropdown, DropdownButton, InputGroup, FormControl} from "react-bootstrap";
import './StudentsPage.css';

interface Student {
    _id: string;
    name: string;
    level: number;
}

const StudentsPage: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [levelFilter, setLevelFilter] = useState('');
    const [page, setPage] = useState(1);
    const [maxPage, setMaxPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const limit = 12;

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    useEffect(() => {
        fetch(`http://localhost:3001/api/students/list?level=${levelFilter}&page=${page}&limit=${limit}&search=${searchTerm}`, {
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => {
                setStudents(data.items);
                setMaxPage(data.maxPages);
            })
            .catch(error => console.error(error));
    }, [levelFilter, page, limit, searchTerm]);

    return (
        <div style={{marginTop: 100}}>
            <h2 className="shop-menu-subhead">
                <p style={{color: "darkgreen"}}>
                    Students List
                </p>
            </h2>
            <Form className="filter-form" style={{display: 'flex', justifyContent: 'center'}}>
                <div style={{
                    marginLeft: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    <p>Filter by Level</p>
                    <DropdownButton
                        style={{top: -10}}
                        id="dropdown-basic-button"
                        title={levelFilter || "Select a level"}
                        onSelect={(selectedKey: any) => setLevelFilter(selectedKey)}
                    >
                        <Dropdown.Item eventKey="1">1</Dropdown.Item>
                        <Dropdown.Item eventKey="2">2</Dropdown.Item>
                        <Dropdown.Item eventKey="3">3</Dropdown.Item>
                        <Dropdown.Item eventKey="4">4</Dropdown.Item>
                    </DropdownButton>
                </div>
                <div style={{
                    marginLeft: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    <p>Page</p>
                    <DropdownButton
                        style={{top: -10}}
                        id="dropdown-basic-button"
                        title={page}
                        onSelect={(selectedKey: any) => setPage(selectedKey)}
                    >
                        {maxPage > 0 && [...Array(maxPage).keys()].map(i => (
                            <Dropdown.Item eventKey={i + 1}>{i + 1}</Dropdown.Item>
                        ))}
                    </DropdownButton>
                </div>
                <div style={{
                    marginLeft: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    <Form.Group controlId="formSearch">
                        <InputGroup className="mb-3">
                            <Form.Label>Search for a student</Form.Label>
                            <InputGroup>
                                <FormControl
                                    placeholder="Search"
                                    aria-label="Search"
                                    aria-describedby="basic-addon2"
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                />
                            </InputGroup>
                        </InputGroup>
                    </Form.Group>
                </div>
            </Form>
            <div className="students-container">
                {students.map((student, index) => (
                    <StudentCard
                        key={index}
                        className="student-card"
                        studentId={student.id}
                        studentName={student.name}
                        level={student.level}
                        subjects={student.subjects}
                    />
                ))}
            </div>
        </div>
    );
};

export default StudentsPage;