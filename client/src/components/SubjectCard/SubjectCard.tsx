import React from 'react';
import { Card, Badge, Button, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Subject } from '../../types/subject.types';
import './SubjectCard.css';

interface SubjectCardProps {
  subject: Subject;
  className?: string;
}

const SubjectCard: React.FC<SubjectCardProps> = ({ subject, className }) => {
  const getLevelBadgeVariant = (level: number) => {
    switch (level) {
      case 1: return 'primary';
      case 2: return 'success';
      case 3: return 'warning';
      case 4: return 'danger';
      default: return 'secondary';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className={`h-100 shadow-sm subject-card ${className || ''}`}>
      <div className="card-header-custom p-3 text-white"
           style={{ backgroundColor: `var(--bs-${getLevelBadgeVariant(subject.level)})` }}>
        <div className="d-flex justify-content-between align-items-center">
          <div className="subject-avatar rounded-circle bg-white text-dark d-flex align-items-center justify-content-center"
               style={{ width: '40px', height: '40px', fontSize: '14px', fontWeight: 'bold' }}>
            {getInitials(subject.doctor?.name)}
          </div>
          <Badge bg="light" text="dark" className="ms-2">
            Level {subject.level}
          </Badge>
        </div>
      </div>

      <Card.Body className="d-flex flex-column">
        <div className="mb-3">
          <Card.Title className="h5 mb-1 text-truncate">
            {subject.name}
          </Card.Title>
          <Card.Subtitle className="text-muted">
            {subject.code}
          </Card.Subtitle>
        </div>

        <div className="mb-3 flex-grow-1">
          <Row className="g-2 text-sm">
            <Col xs={12}>
              <strong className="text-muted">Doctor:</strong>
              <br />
              <span className="text-dark">
                {subject.doctor?.name || 'Not assigned'}
              </span>
            </Col>

            {subject.teachingAssistant && (
              <Col xs={12}>
                <strong className="text-muted">Teaching Assistant:</strong>
                <br />
                <span className="text-dark">{subject.teachingAssistant.name}</span>
              </Col>
            )}

            <Col xs={12}>
              <strong className="text-muted">Students:</strong>
              <br />
              <span className="text-dark">
                {subject.studentsCount || 0} enrolled
              </span>
            </Col>
          </Row>
        </div>

        <div className="d-flex justify-content-between align-items-center mt-auto">
          <Link to={`/subject/${subject._id}`} className="text-decoration-none flex-grow-1">
            <Button variant="outline-primary" size="sm" className="w-100">
              View Details
            </Button>
          </Link>
        </div>

        {subject.startWeek && (
          <div className="mt-2 text-center">
            <small className="text-muted">
              Started: {new Date(subject.startWeek).toLocaleDateString()}
            </small>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default SubjectCard;