import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {Card, ListGroup, Form} from 'react-bootstrap';
import axios from 'axios';

interface CameraDetail {
    _id: string;
    cameraId: string;
    subjectId: string;
    groupNumber: number;
    sectionNumber: number;
}

interface Subject {
    id: string;
    name: string;
    groupsCount: number;
    sectionsCount: number;
}

const CameraDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [cameraDetail, setCameraDetail] = useState<CameraDetail | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [selectedGroup, setSelectedGroup] = useState<string>('');
    const [selectedSection, setSelectedSection] = useState<string>('');

    useEffect(() => {
        fetch(`http://localhost:3001/api/camera/${id}`, {
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => {
                setCameraDetail(data);
                setSelectedSubject(data.subjectId.name); // Set the selected subject to the current camera's subject name
                setSelectedGroup(data.groupNumber ? data.groupNumber.toString() : ''); // Set the selected group to the current camera's group
                setSelectedSection(data.sectionNumber ? data.sectionNumber.toString() : ''); // Set the selected section to the current camera's section
            })
            .catch(error => console.error(error));

        fetch('http://localhost:3001/api/subjects/list', {
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => setSubjects(data))
            .catch(error => console.error(error));
    }, [id]);

    const handleGroupChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedGroup(e.target.value);
        setSelectedSection(''); // Reset the section to its default value
        // Update the camera's group
        await axios.put(`http://localhost:3001/api/camera/${id}`, { groupNumber: e.target.value, sectionNumber: null });
    };

    const handleSectionChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedSection(e.target.value);
        setSelectedGroup(''); // Reset the group to its default value
        // Update the camera's section
        await axios.put(`http://localhost:3001/api/camera/${id}`, { sectionNumber: e.target.value, groupNumber: null });
    };

    const handleSubjectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedSubject(e.target.value);
        setSelectedGroup(''); // Reset the group to its default value
        setSelectedSection(''); // Reset the section to its default value
        // Update the camera's subject
        const subject = subjects.find(subject => subject.name === e.target.value);
        if (subject) {
            await axios.put(`http://localhost:3001/api/camera/${id}`, { subjectId: subject.id });
        }
    };

    const selectedSubjectDetail = subjects.find(subject => subject.name === selectedSubject);

    if (!cameraDetail) {
        return <div>Loading...</div>;
    }
    else {
        console.log(selectedSubjectDetail);
    }

    return (
        <div className="card-container">
            <Card>
                <Card.Header className="header">{cameraDetail.cameraId}</Card.Header>
                <ListGroup variant="flush">
                    <ListGroup.Item>
                        Subject ID:
                        <Form.Control as="select" value={selectedSubject} onChange={handleSubjectChange}>
                            <option value="">Select a subject</option>
                            {subjects.map(subject => (
                                <option key={subject._id} value={subject.name}>{subject.name}</option>
                            ))}
                        </Form.Control>
                    </ListGroup.Item>
                    <ListGroup.Item>
                        Group Number:
                        <Form.Control as="select" value={selectedGroup} onChange={handleGroupChange}>
                            <option value="">Select a group</option>
                            {selectedSubjectDetail && Array.from({ length: selectedSubjectDetail.groupsCount }, (_, index) => (
                                <option key={index + 1} value={index + 1}>{index + 1}</option>
                            ))}
                        </Form.Control>
                    </ListGroup.Item>
                    {selectedSubjectDetail && selectedSubjectDetail.sectionsCount > 0 && (
                        <ListGroup.Item>
                            Section Number:
                            <Form.Control as="select" value={selectedSection} onChange={handleSectionChange}>
                                <option value="">Select a section</option>
                                {Array.from({ length: selectedSubjectDetail.sectionsCount }, (_, index) => (
                                    <option key={index + 1} value={index + 1}>{index + 1}</option>
                                ))}
                            </Form.Control>
                        </ListGroup.Item>
                    )}
                </ListGroup>
            </Card>
        </div>
    );
};

export default CameraDetailPage;