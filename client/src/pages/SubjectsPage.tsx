import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Form, Button, Alert, Card, Pagination } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useSubjects } from '../hooks/useSubjects';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner, SkeletonLoader } from '../components/common/LoadingComponents';
import SubjectCard from '../components/SubjectCard/SubjectCard';
import { Subject, SubjectFilters } from '../types/subject.types';
import { User } from '../types/auth.types';
import api from '../services/api.service';

const SubjectsPage: React.FC = () => {
  const [filters, setFilters] = useState<SubjectFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [assistants, setAssistants] = useState<User[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  const { user } = useAuth();
  const {
    subjects,
    pagination,
    loading,
    error,
    fetchSubjects,
    reset
  } = useSubjects();

  useEffect(() => {
    loadSubjects();
    loadTeachers();
  }, [currentPage, filters]);

  const loadSubjects = async () => {
    try {
      await fetchSubjects(filters, currentPage, 12);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    }
  };

  const loadTeachers = async () => {
    if (user?.role !== 'management') return;

    try {
      setLoadingTeachers(true);
      const [doctorsResponse, assistantsResponse] = await Promise.all([
        api.get('/users/doctors'),
        api.get('/users/assistants')
      ]);

      setDoctors(doctorsResponse.data.data || doctorsResponse.data);
      setAssistants(assistantsResponse.data.data || assistantsResponse.data);
    } catch (err) {
      console.error('Failed to load teachers:', err);
    } finally {
      setLoadingTeachers(false);
    }
  };

  const handleFilterChange = (filterType: keyof SubjectFilters, value: string) => {
    setFilters({ ...filters, [filterType]: value || undefined });
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);

    for (let page = startPage; page <= endPage; page++) {
      items.push(
        <Pagination.Item
          key={page}
          active={page === currentPage}
          onClick={() => handlePageChange(page)}
        >
          {page}
        </Pagination.Item>
      );
    }
    return items;
  };

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Subjects</Alert.Heading>
          <p>{error.message}</p>
          <Button variant="outline-danger" onClick={() => {
            reset();
            loadSubjects();
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
            <h2 className="text-primary mb-0">Subjects ({pagination.totalItems})</h2>
            {user?.role === 'management' && (
              <Link to="/admin/add-subject">
                <Button variant="success">
                  <i className="fas fa-plus me-2"></i>
                  Add New Subject
                </Button>
              </Link>
            )}
          </div>

          {/* Filters */}
          <Card className="mb-4">
            <Card.Body>
              <Row>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Filter by Level</Form.Label>
                    <Form.Select
                      value={filters.level || ''}
                      onChange={(e) => handleFilterChange('level', e.target.value)}
                      disabled={loading}
                    >
                      <option value="">All Levels</option>
                      <option value="1">Level 1</option>
                      <option value="2">Level 2</option>
                      <option value="3">Level 3</option>
                      <option value="4">Level 4</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                {user?.role === 'management' && (
                  <>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Filter by Doctor</Form.Label>
                        <Form.Select
                          value={filters.doctor || ''}
                          onChange={(e) => handleFilterChange('doctor', e.target.value)}
                          disabled={loading || loadingTeachers}
                        >
                          <option value="">All Doctors</option>
                          {doctors.map((doctor) => (
                            <option key={doctor._id} value={doctor._id}>
                              {doctor.name}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Filter by Assistant</Form.Label>
                        <Form.Select
                          value={filters.assistant || ''}
                          onChange={(e) => handleFilterChange('assistant', e.target.value)}
                          disabled={loading || loadingTeachers}
                        >
                          <option value="">All Assistants</option>
                          {assistants.map((assistant) => (
                            <option key={assistant._id} value={assistant._id}>
                              {assistant.name}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </>
                )}

                <Col md={3}>
                  <Form.Group>
                    <Form.Label>&nbsp;</Form.Label>
                    <div>
                      <Button
                        variant="outline-secondary"
                        onClick={clearFilters}
                        disabled={loading}
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

      {/* Subjects Grid */}
      {loading && currentPage === 1 ? (
        <Row>
          {Array.from({ length: 8 }).map((_, index) => (
            <Col md={6} lg={4} xl={3} className="mb-3" key={index}>
              <Card>
                <Card.Body>
                  <SkeletonLoader lines={5} />
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <>
          {subjects.length === 0 ? (
            <Row>
              <Col>
                <Alert variant="info" className="text-center">
                  <h5>No subjects found</h5>
                  <p>
                    {user?.role === 'management'
                      ? 'Try adjusting your filters or add a new subject.'
                      : 'No subjects are currently assigned to you.'
                    }
                  </p>
                  {user?.role === 'management' && (
                    <Link to="/admin/add-subject">
                      <Button variant="primary">Add New Subject</Button>
                    </Link>
                  )}
                </Alert>
              </Col>
            </Row>
          ) : (
            <Row>
              {subjects.map((subject: Subject) => (
                <Col md={6} lg={4} xl={3} className="mb-3" key={subject._id}>
                  <SubjectCard subject={subject} />
                </Col>
              ))}
            </Row>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Row className="mt-4">
              <Col className="d-flex justify-content-center">
                <Pagination>
                  <Pagination.Prev
                    disabled={!pagination.hasPrev || loading}
                    onClick={() => handlePageChange(currentPage - 1)}
                  />
                  {renderPaginationItems()}
                  <Pagination.Next
                    disabled={!pagination.hasNext || loading}
                    onClick={() => handlePageChange(currentPage + 1)}
                  />
                </Pagination>
              </Col>
            </Row>
          )}

          {loading && currentPage > 1 && (
            <div className="text-center mt-3">
              <LoadingSpinner message="Loading more subjects..." />
            </div>
          )}
        </>
      )}
    </Container>
  );
};

export default SubjectsPage;