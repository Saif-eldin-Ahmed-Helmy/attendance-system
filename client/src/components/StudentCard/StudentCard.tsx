import React from 'react';
import { Card, Badge, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Student } from '../../types/student.types';
import './StudentCard.css';

interface StudentCardProps {
  student: Student;
  className?: string;
}

const StudentCard: React.FC<StudentCardProps> = ({ student, className }) => {
  const getLevelBadgeVariant = (level: number) => {
    switch (level) {
      case 1: return 'primary';
      case 2: return 'success';
      case 3: return 'warning';
      case 4: return 'danger';
      default: return 'secondary';
    }
  };

  return (
    <Card className={`h-100 shadow-sm student-card ${className || ''}`}>
      <Card.Body className="d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <Card.Title className="h5 mb-0 text-truncate">
            {student.name}
          </Card.Title>
          <Badge bg={getLevelBadgeVariant(student.level)}>
            Level {student.level}
          </Badge>
        </div>

        <Card.Subtitle className="mb-2 text-muted">
          ID: {student.id}
        </Card.Subtitle>

        <div className="mb-3 flex-grow-1">
          <small className="text-muted d-block mb-1">
            Subjects ({student.subjects?.length || 0}):
          </small>
          <div className="subject-list">
            {student.subjects && student.subjects.length > 0 ? (
              student.subjects.slice(0, 3).map((subjectName, index) => (
                <Badge
                  key={index}
                  bg="light"
                  text="dark"
                  className="me-1 mb-1"
                >
                  {typeof subjectName === 'string' ? subjectName : subjectName}
                </Badge>
              ))
            ) : (
              <small className="text-muted">No subjects assigned</small>
            )}
            {student.subjects && student.subjects.length > 3 && (
              <Badge bg="secondary" className="me-1 mb-1">
                +{student.subjects.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center mt-auto">
          <Link to={`/students/${student.id}`} className="text-decoration-none">
            <Button variant="outline-primary" size="sm">
              View Details
            </Button>
          </Link>
          <small className="text-muted">
            {student.createdAt && new Date(student.createdAt).toLocaleDateString()}
          </small>
        </div>
      </Card.Body>
    </Card>
  );
};

export default StudentCard;