import React from 'react';
import { Card, Button } from 'react-bootstrap';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Announcement from '../../types/Announcement';
import './AnnouncementsCards.css';

interface AnnouncementCardProps {
  announcement: Announcement;
  onEdit: (announcement: Announcement) => void;
  onDelete: (id: string) => void;
}

const AnnouncementCard: React.FC<AnnouncementCardProps> = ({ announcement, onEdit, onDelete }) => {
  const navigate = useNavigate();
  return (
    <Card className="announcement-card">
      <Card.Body className="card-body">
        <div onClick={() => navigate(`/announcement/${announcement._id}`)} style={{ cursor: 'pointer' }}>
          <Card.Title className="card-title">{announcement.title}</Card.Title>
          <Card.Text className="card-text">
            {announcement.content.length > 10 ? `${announcement.content.substring(0, 10)}...` : announcement.content}
          </Card.Text>
          <Card.Text className="card-text">
            <small>
              Created At: {new Date(announcement.createdAt).toLocaleDateString('en-GB')} {new Date(announcement.createdAt).toLocaleTimeString()}
            </small>
            <br />
            <small>
              Last Updated: {new Date(announcement.lastUpdatedAt).toLocaleDateString('en-GB')} {new Date(announcement.lastUpdatedAt).toLocaleTimeString()}
            </small>
          </Card.Text>
        </div>
        <div className="d-flex justify-content-center align-items-center">
          <Button variant="warning" size="sm" className="me-2" onClick={() => onEdit(announcement)}>
            <FaEdit className="me-1" /> Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => onDelete(announcement._id)}>
            <FaTrash className="me-1" /> Delete
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default AnnouncementCard;