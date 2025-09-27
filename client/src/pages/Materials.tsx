import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Form, Button, Alert, Card, Pagination, Modal } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useApi, usePaginatedApi } from '../hooks/useApi';
import { LoadingSpinner, SkeletonLoader, LoadingButton } from '../components/common/LoadingComponents';
import MaterialCard from '../components/MaterialCard/MaterialCard';
import { Material, CreateMaterialRequest, MaterialFilters } from '../types/material.types';
import { Subject } from '../types/subject.types';
import { materialSchema } from '../utils/validation.utils';
import api from '../services/api.service';

const Materials: React.FC = () => {
  const [filters, setFilters] = useState<MaterialFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const materialsApi = usePaginatedApi<Material>();
  const subjectsApi = useApi<Subject[]>();
  const createApi = useApi<Material>();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateMaterialRequest>({
    resolver: yupResolver(materialSchema)
  });

  useEffect(() => {
    loadMaterials();
    loadSubjects();
  }, [currentPage, filters]);

  const loadMaterials = async () => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: '12',
      ...filters
    });

    try {
      await materialsApi.fetchPage(() => api.get(`/material?${params}`), { page: currentPage });
    } catch (err) {
      console.error('Failed to load materials:', err);
    }
  };

  const loadSubjects = async () => {
    try {
      const response = await subjectsApi.execute(() => api.get('/subjects/list'));
      if (response) {
        setSubjects(response);
      }
    } catch (err) {
      console.error('Failed to load subjects:', err);
    }
  };

  const handleCreateMaterial = async (data: CreateMaterialRequest) => {
    try {
      await createApi.execute(() => api.post('/material', data));
      setShowCreateModal(false);
      reset();
      loadMaterials(); // Refresh materials list
    } catch (err) {
      console.error('Failed to create material:', err);
    }
  };

  const handleFilterChange = (filterType: keyof MaterialFilters, value: string) => {
    setFilters({ ...filters, [filterType]: value || undefined });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (materialsApi.error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Materials</Alert.Heading>
          <p>{materialsApi.error.message}</p>
          <Button variant="outline-danger" onClick={() => {
            materialsApi.reset();
            loadMaterials();
          }}>
            Try Again
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="text-primary mb-0">
              Course Materials ({materialsApi.pagination.totalItems})
            </h2>
            <Button variant="success" onClick={() => setShowCreateModal(true)}>
              <i className="fas fa-plus me-2"></i>
              Add Material
            </Button>
          </div>

          {/* Filters */}
          <Card className="mb-4">
            <Card.Body>
              <Row>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Filter by Subject</Form.Label>
                    <Form.Select
                      value={filters.subject || ''}
                      onChange={(e) => handleFilterChange('subject', e.target.value)}
                      disabled={materialsApi.loading || subjectsApi.loading}
                    >
                      <option value="">All Subjects</option>
                      {subjects.map((subject) => (
                        <option key={subject._id} value={subject._id}>
                          {subject.name} ({subject.code})
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>&nbsp;</Form.Label>
                    <div>
                      <Button
                        variant="outline-secondary"
                        onClick={clearFilters}
                        disabled={materialsApi.loading}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Materials Grid */}
      {materialsApi.loading && currentPage === 1 ? (
        <Row>
          {Array.from({ length: 8 }).map((_, index) => (
            <Col md={6} lg={4} xl={3} className="mb-3" key={index}>
              <Card>
                <Card.Body>
                  <SkeletonLoader lines={4} />
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <>
          {materialsApi.items.length === 0 ? (
            <Row>
              <Col>
                <Alert variant="info" className="text-center">
                  <h5>No materials found</h5>
                  <p>No course materials have been uploaded yet.</p>
                  <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                    Upload First Material
                  </Button>
                </Alert>
              </Col>
            </Row>
          ) : (
            <Row>
              {materialsApi.items.map((material: Material) => (
                <Col md={6} lg={4} xl={3} className="mb-3" key={material._id}>
                  <MaterialCard material={material} />
                </Col>
              ))}
            </Row>
          )}

          {/* Pagination */}
          {materialsApi.pagination.totalPages > 1 && (
            <Row className="mt-4">
              <Col className="d-flex justify-content-center">
                <Pagination>
                  <Pagination.Prev
                    disabled={!materialsApi.pagination.hasPrev || materialsApi.loading}
                    onClick={() => handlePageChange(currentPage - 1)}
                  />
                  {/* Pagination items */}
                  <Pagination.Next
                    disabled={!materialsApi.pagination.hasNext || materialsApi.loading}
                    onClick={() => handlePageChange(currentPage + 1)}
                  />
                </Pagination>
              </Col>
            </Row>
          )}
        </>
      )}

      {/* Create Material Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add New Material</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {createApi.error && (
            <Alert variant="danger" className="mb-3">
              {createApi.error.message}
            </Alert>
          )}

          <Form onSubmit={handleSubmit(handleCreateMaterial)}>
            <Form.Group className="mb-3">
              <Form.Label>Title *</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter material title"
                {...register('title')}
                isInvalid={!!errors.title}
              />
              <Form.Control.Feedback type="invalid">
                {errors.title?.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Enter material description (optional)"
                {...register('description')}
                isInvalid={!!errors.description}
              />
              <Form.Control.Feedback type="invalid">
                {errors.description?.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Subject *</Form.Label>
              <Form.Select
                {...register('subject')}
                isInvalid={!!errors.subject}
              >
                <option value="">Select a subject</option>
                {subjects.map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">
                {errors.subject?.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Link</Form.Label>
              <Form.Control
                type="url"
                placeholder="Enter material link (optional)"
                {...register('link')}
                isInvalid={!!errors.link}
              />
              <Form.Control.Feedback type="invalid">
                {errors.link?.message}
              </Form.Control.Feedback>
            </Form.Group>

            <div className="d-flex justify-content-end">
              <Button
                variant="secondary"
                className="me-2"
                onClick={() => setShowCreateModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                variant="primary"
                loading={isSubmitting || createApi.loading}
                loadingText="Creating..."
              >
                Create Material
              </LoadingButton>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default Materials;