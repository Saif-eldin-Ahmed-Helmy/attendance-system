import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Form, Button, Alert, Card, Pagination } from 'react-bootstrap';
import { useStudents } from '../hooks/useStudents';
import { LoadingSpinner, SkeletonLoader } from '../components/common/LoadingComponents';
import StudentCard from '../components/StudentCard/StudentCard';
import { Student, StudentFilters } from '../types/student.types';

const StudentsPage: React.FC = () => {
  const [filters, setFilters] = useState<StudentFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    students,
    pagination,
    loading,
    error,
    fetchStudents,
    reset
  } = useStudents();

  useEffect(() => {
    loadStudents();
  }, [currentPage, filters]);

  const loadStudents = async () => {
    const searchFilters: StudentFilters = {
      ...filters,
      ...(searchTerm && { search: searchTerm })
    };

    try {
      await fetchStudents(searchFilters, currentPage, 12);
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadStudents();
  };

  const handleLevelFilter = (level: string) => {
    setFilters({ ...filters, level: level || undefined });
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
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
          <Alert.Heading>Error Loading Students</Alert.Heading>
          <p>{error.message}</p>
          <Button variant="outline-danger" onClick={() => {
            reset();
            loadStudents();
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
            <h2 className="text-primary mb-0">Students ({pagination.totalItems})</h2>
          </div>

          {/* Filters and Search */}
          <Card className="mb-4">
            <Card.Body>
              <Row>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Search Students</Form.Label>
                    <div className="d-flex">
                      <Form.Control
                        type="text"
                        placeholder="Search by name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      />
                      <Button
                        variant="primary"
                        className="ms-2"
                        onClick={handleSearch}
                        disabled={loading}
                      >
                        Search
                      </Button>
                    </div>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Filter by Level</Form.Label>
                    <Form.Select
                      value={filters.level || ''}
                      onChange={(e) => handleLevelFilter(e.target.value)}
                    >
                      <option value="">All Levels</option>
                      <option value="1">Level 1</option>
                      <option value="2">Level 2</option>
                      <option value="3">Level 3</option>
                      <option value="4">Level 4</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>&nbsp;</Form.Label>
                    <div>
                      <Button
                        variant="outline-secondary"
                        onClick={() => {
                          setFilters({});
                          setSearchTerm('');
                          setCurrentPage(1);
                        }}
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

      {/* Students Grid */}
      {loading && currentPage === 1 ? (
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
          {students.length === 0 ? (
            <Row>
              <Col>
                <Alert variant="info" className="text-center">
                  <h5>No students found</h5>
                  <p>Try adjusting your search criteria or filters.</p>
                </Alert>
              </Col>
            </Row>
          ) : (
            <Row>
              {students.map((student: Student) => (
                <Col md={6} lg={4} xl={3} className="mb-3" key={student._id}>
                  <StudentCard student={student} />
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
              <LoadingSpinner message="Loading more students..." />
            </div>
          )}
        </>
      )}
    </Container>
  );
};

export default StudentsPage;