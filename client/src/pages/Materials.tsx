import React, { useEffect, useState } from 'react';
import MaterialCard from '../components/MaterialCard/MaterialCard';
import api from '../services/api';
import { Button, Row, Col, Modal, Form, Nav } from 'react-bootstrap';
import Material from '../types/Mateial';
import Subject from '../types/Subject';
import { FaDoorClosed, FaRegSave } from 'react-icons/fa';

const Materials: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalData, setModalData] = useState<Partial<Material>>({});
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  // Fetch materials
  const fetchMaterials = async () => {
    try {
      const response = await api.get('/material');
      console.log('Materials from API:', response.data);
      setMaterials(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch materials.');
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/subjects');
      console.log('Subjects API response:', response.data);

      const subjectsData = Array.isArray(response.data)
        ? response.data
        : response.data.items
          ? response.data.items
          : [];

      console.log('Processed subjects:', subjectsData);
      setSubjects(subjectsData);
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
      setSubjects([]);
    }
  };

  useEffect(() => {
    fetchMaterials();
    fetchSubjects();
  }, []);
  
  // Debug filtering when activeSubject changes
  useEffect(() => {
    if (activeSubject) {
      console.log('Active subject:', activeSubject);
      console.log('Filtered materials:', materials.filter(m => m.subjectId === activeSubject));
      
      // Check if subjectId format matches
      const matchingMaterials = materials.filter(m => {
        console.log(`Comparing material.subjectId: ${m.subjectId} with activeSubject: ${activeSubject}`);
        return m.subjectId === activeSubject;
      });
      console.log('Matching materials:', matchingMaterials);
    }
  }, [activeSubject, materials]);

  const handleCreate = async () => {
    try {
      const { name, subjectId, link } = modalData;
      if (!name || !subjectId || !link) {
        alert('All fields are required.');
        return;
      }
      await api.post('/material', { name, subjectId, link });
      setShowModal(false);
      setModalData({});
      fetchMaterials();
    } catch (err) {
      alert('Failed to create material.');
    }
  };

  const handleEdit = async () => {
    try {
      const { _id, name, subjectId, link } = modalData;
      if (!_id || !name || !subjectId || !link) {
        alert('All fields are required.');
        return;
      }
      await api.put(`/material/${_id}`, { name, subjectId, link });
      setShowModal(false);
      setModalData({});
      setIsEditing(false);
      fetchMaterials();
    } catch (err) {
      alert('Failed to update material.');
    }
  };

  const openCreateModal = () => {
    setModalData({});
    setIsEditing(false);
    fetchSubjects().then(() => {
      setShowModal(true);
    });
  };

  const openEditModal = (material: Material) => {
    setModalData(material);
    setIsEditing(true);
    fetchSubjects().then(() => {
      setShowModal(true);
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/material/${id}`);
      fetchMaterials();
    } catch (err) {
      alert('Failed to delete material.');
    }
  };

  // Improved filtering logic with string normalization
  const filteredMaterials = activeSubject
    ? materials.filter(material => {
        // Handle potential string/object ID inconsistencies
        const materialSubjectId = String(material.subjectId).trim();
        const activeSubjectId = String(activeSubject).trim();
        return materialSubjectId === activeSubjectId;
      })
    : materials;

  if (loading) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="container mt-4 text-center text-danger">{error}</div>;
  }

  return (
    <div className="container mt-4">
      <h1 className="text-center mb-4">Materials</h1>
      <Button className="mb-3" variant="success" onClick={openCreateModal}>
        Add Material
      </Button>

      {/* Subject Tabs - Centered */}
      <Nav variant="tabs" className="mb-3 justify-content-center">
        <Nav.Item>
          <Nav.Link 
            active={activeSubject === null} 
            onClick={() => setActiveSubject(null)}
          >
            All Materials
          </Nav.Link>
        </Nav.Item>
        {subjects.map(subject => (
          <Nav.Item key={subject._id}>
            <Nav.Link 
              active={activeSubject === subject._id}
              onClick={() => setActiveSubject(subject._id)}
            >
              {subject.name}
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      {/* Show message when no materials match the filter */}
      {filteredMaterials.length === 0 && (
        <div className="alert alert-info">
          {activeSubject ? "No materials found for this subject" : "No materials available"}
        </div>
      )}
      
      <Row className="g-3">
        {filteredMaterials.map((material) => (
          <Col key={material._id} xs={12} sm={6} md={4} lg={3}>
            <MaterialCard material={material} onEdit={openEditModal} onDelete={handleDelete} />
          </Col>
        ))}
      </Row>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{isEditing ? 'Edit Material' : 'Add Material'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter material name"
                value={modalData.name || ''}
                onChange={(e) => setModalData({ ...modalData, name: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Subject</Form.Label>
              <Form.Control
                as="select"
                value={modalData.subjectId || ''}
                onChange={(e) => setModalData({ ...modalData, subjectId: e.target.value })}
                className="form-select"
              >
                <option value="">Select a subject</option>
                {subjects.length > 0 ? (
                  subjects.map((subject) => (
                    <option key={subject._id} value={subject._id}>
                      {subject.name}
                    </option>
                  ))
                ) : (
                  <option disabled>No subjects available</option>
                )}
              </Form.Control>
              {subjects.length === 0 && (
                <Form.Text className="text-muted">
                  Loading subjects or none available.
                </Form.Text>
              )}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Material Link</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter PDF link"
                value={modalData.link || ''}
                onChange={(e) => setModalData({ ...modalData, link: e.target.value })}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            <FaDoorClosed /> Cancel
          </Button>
          <Button variant="primary" onClick={isEditing ? handleEdit : handleCreate}>
            <FaRegSave /> Save
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Materials;