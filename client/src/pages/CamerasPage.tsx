import React, { useEffect, useState } from 'react';
import {Link, useNavigate} from 'react-router-dom';
import { Button, Modal, Form, Card, Row, Col } from 'react-bootstrap';
import axios from 'axios';

interface Camera {
    _id: string;
    cameraId: string;
    subjectId: {
        _id: string;
        name: string;
        level: number;
        doctor: string;
        teachingAssistant: string;
        groups: Array<{ groupNumber: number }>;
        sections: Array<{ sectionNumber: number }>;
        startWeek: string;
    };
    groupNumber: number;
    sectionNumber: number;
}

const CamerasPage: React.FC = () => {
    const [cameras, setCameras] = useState<Camera[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [cameraId, setCameraId] = useState('');
    const navigate = useNavigate();

    const handleAddCamera = async () => {
        try {
            await axios.post('http://localhost:3001/api/camera', { cameraId });
            setShowModal(false);
            setCameraId('');
            // Refresh the cameras list
            const { data } = await axios.get('http://localhost:3001/api/camera');
            setCameras(data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        axios.get('http://localhost:3001/api/camera')
            .then(response => setCameras(response.data))
            .catch(error => console.error(error));
    }, []);

    return (
        <div>
            <Button onClick={() => setShowModal(true)}>Add Camera</Button>
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Add Camera</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group controlId="cameraId">
                        <Form.Label>Camera ID</Form.Label>
                        <Form.Control type="text" value={cameraId} onChange={(e) => setCameraId(e.target.value)} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                    <Button variant="primary" onClick={handleAddCamera}>Add Camera</Button>
                </Modal.Footer>
            </Modal>
            <Row className="mt-4">
                {cameras.map(camera => (
                    <Col sm={6} md={4} lg={3} key={camera._id}>
                        <Card className="mb-4">
                            <Card.Body>
                                <Card.Title>{camera.cameraId}</Card.Title>
                                {camera.subjectId.name && <Card.Text>Subject: {camera.subjectId.name}</Card.Text>}
                                {camera.groupNumber && <Card.Text>Group Number: {camera.groupNumber}</Card.Text>}
                                {camera.sectionNumber && <Card.Text>Section Number: {camera.sectionNumber}</Card.Text>}
                                <div className="d-flex justify-content-center">
                                    <Button variant="primary" onClick={() => navigate(`/cameras/${camera._id}`)}>View Details</Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    );
};

export default CamerasPage;