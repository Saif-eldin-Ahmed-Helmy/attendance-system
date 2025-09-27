import React from 'react';
import { Card, Button, Badge } from 'react-bootstrap';
import { Material } from '../../types/material.types';
import './MaterialCards.css';

interface MaterialCardProps {
  material: Material;
  className?: string;
}

const MaterialCard: React.FC<MaterialCardProps> = ({ material, className }) => {
  const getFileTypeIcon = (fileType?: string) => {
    if (!fileType) return '📄';

    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('video')) return '🎥';
    if (fileType.includes('audio')) return '🎵';
    if (fileType.includes('text')) return '📝';
    return '📄';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';

    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const handleDownload = () => {
    if (material.fileUrl || material.link) {
      window.open(material.fileUrl || material.link, '_blank');
    }
  };

  return (
    <Card className={`h-100 shadow-sm material-card ${className || ''}`}>
      <Card.Body className="d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="file-icon fs-3">
            {getFileTypeIcon(material.fileType)}
          </div>
          <Badge bg="primary" className="text-uppercase">
            {material.subject.code}
          </Badge>
        </div>

        <Card.Title className="h6 mb-2 text-truncate" title={material.title}>
          {material.title}
        </Card.Title>

        <Card.Subtitle className="text-muted mb-2 small">
          {material.subject.name}
        </Card.Subtitle>

        {material.description && (
          <Card.Text className="small text-muted mb-3 flex-grow-1">
            {material.description.length > 100
              ? `${material.description.substring(0, 100)}...`
              : material.description
            }
          </Card.Text>
        )}

        <div className="mt-auto">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <small className="text-muted">
              By: {material.uploadedBy.name}
            </small>
            {material.fileSize && (
              <small className="text-muted">
                {formatFileSize(material.fileSize)}
              </small>
            )}
          </div>

          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              {new Date(material.createdAt).toLocaleDateString()}
            </small>
            <div>
              <Badge bg="light" text="dark" className="me-2">
                {material.downloadCount} downloads
              </Badge>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={handleDownload}
                disabled={!material.fileUrl && !material.link}
              >
                {material.fileUrl ? 'Download' : 'Open Link'}
              </Button>
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default MaterialCard;