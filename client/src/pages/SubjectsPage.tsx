import React, { useEffect, useState } from 'react';
import SubjectCard from '../components/SubjectCard/SubjectCard.tsx';
import {Form, Dropdown, DropdownButton, Button} from "react-bootstrap";
import './SubjectsPage.css';
import {Link} from "react-router-dom";

interface Subject {
    _id: string;
    name: string;
    doctor: string;
    teachingAssistant: string;
    studentsCount: number;
    level: number;
}

interface User {
    _id: string;
    name: string;
}

const SubjectsPage: React.FC = () => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [doctorFilter, setDoctorFilter] = useState('');
    const [assistantFilter, setAssistantFilter] = useState('');
    const [levelFilter, setLevelFilter] = useState('');
    const [doctors, setDoctors] = useState<User[]>([]);
    const [assistants, setAssistants] = useState<User[]>([]);
    const [page, setPage] = useState(1);
    const [maxPage, setMaxPage] = useState(1);
    const limit = 12;

    useEffect(() => {
        fetch(`http://localhost:3001/api/subjects?doctor=${doctorFilter}&assistant=${assistantFilter}&level=${levelFilter}&page=${page}&limit=${limit}`, {
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => {
                setSubjects(data.items);
                setMaxPage(data.maxPages);
            })
            .catch(error => console.error(error));
    }, [doctorFilter, assistantFilter, levelFilter, page, limit]);

    useEffect(() => {
        fetch('http://localhost:3001/api/users/doctors', {
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => setDoctors(data))
            .catch(error => console.error(error));
    }, []);

    useEffect(() => {
        fetch('http://localhost:3001/api/users/assistants', {
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => setAssistants(data))
            .catch(error => console.error(error));
    }, []);

    return (
        <div style={{marginTop: 100}}>
            <h2 className="shop-menu-subhead">
                <p style={{color: "darkgreen"}}>
                    Subjects List
                </p>
            </h2>
            <Form className="filter-form" style={{display: 'flex', justifyContent: 'center'}}>
                <Form.Group style={{marginRight: '20px'}} controlId="doctorFilter" className="form-group">
                    <Form.Label>Filter by Doctor</Form.Label>
                    <Form.Control as="select" value={doctorFilter} onChange={e => setDoctorFilter(e.target.value)}
                                  className="form-control">
                        <option value="">Select a doctor</option>
                        {doctors.map((doc, index) => (
                            <option key={index} value={doc._id}>{doc.name}</option>
                        ))}
                    </Form.Control>
                </Form.Group>
                <Form.Group controlId="assistantFilter" className="form-group">
                    <Form.Label>Filter by Assistant</Form.Label>
                    <Form.Control as="select" value={assistantFilter} onChange={e => setAssistantFilter(e.target.value)}
                                  className="form-control">
                        <option value="">Select an assistant</option>
                        {assistants.map((assistant, index) => (
                            <option key={index} value={assistant._id}>{assistant.name}</option>
                        ))}
                    </Form.Control>
                </Form.Group>
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
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Link to="/admin/add-subject">
                        <Button variant="primary" style={{width: '130%', height: '130%'}}>Add Subject</Button>
                    </Link>
                </div>
            </Form>
            <div className="subjects-container">
                {subjects.map((subject, index) => (
                    <SubjectCard
                        key={index}
                        className="subject-card"
                        subjectId={subject._id}
                        subjectName={subject.name}
                        doctorName={subject.doctor}
                        assistantName={subject.teachingAssistant}
                        studentsCount={subject.studentsCount}
                        level={subject.level}
                    />
                ))}
            </div>
        </div>
    );
};

export default SubjectsPage;