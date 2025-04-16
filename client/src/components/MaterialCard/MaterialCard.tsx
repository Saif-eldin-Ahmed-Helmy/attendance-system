import React from 'react';
import { Card, Button, Badge } from 'react-bootstrap';
import './MaterialCards.css';
import { FaLink, FaCalendarAlt, FaEdit, FaTrash } from 'react-icons/fa';
import Material from '../../types/Mateial';

interface MaterialCardProps {
  material: Material;
  onEdit: (material: Material) => void;
  onDelete: (id: string) => void;
}

// freaks
const badgeColors = ['primary', 'success', 'danger', 'warning', 'info', 'secondary'];

const MaterialCard: React.FC<MaterialCardProps> = ({ material, onEdit, onDelete }) => {

  const randomColor = badgeColors[Math.floor(Math.random() * badgeColors.length)];

  return (
    <Card className="material-card shadow-sm">
      <Card.Body className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Badge bg={randomColor} className="text-uppercase">
            {material.subjectId.name}
          </Badge>
        </div>
        <a href={material.link} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
          <Card.Title className="card-title">{material.name}</Card.Title>
          <Card.Text className="card-text">
            <FaLink className="me-2 text-primary" />
            {material.link.length > 30 ? `${material.link.substring(0, 30)}...` : material.link}
          </Card.Text>
        </a>
        <Card.Text className="card-text">
          <small>
            <FaCalendarAlt className="me-2 text-secondary" />
            Created At: {new Date(material.createdAt).toLocaleDateString('en-GB')} {new Date(material.createdAt).toLocaleTimeString()}
          </small>
        </Card.Text>
        <div className="d-flex justify-content-center align-items-center mt-3">
          <Button variant="warning" size="sm" className="me-2" onClick={() => onEdit(material)}>
            <FaEdit className="me-1" /> Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => onDelete(material._id)}>
            <FaTrash className="me-1" /> Delete
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default MaterialCard;