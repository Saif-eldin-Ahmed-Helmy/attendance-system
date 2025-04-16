import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { FaCalendarAlt, FaClock, FaEdit } from 'react-icons/fa';

interface Announcement {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  lastUpdatedAt: string;
}

const AnnouncementDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const response = await api.get(`/announcement/${id}`);
        setAnnouncement(response.data);
      } catch (err) {
        console.error('Failed to fetch announcement details.');
      }
    };

    fetchAnnouncement();
  }, [id]);

  if (!announcement) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <h1
            className="mb-4"
            style={{
              fontWeight: 'bold',
              textAlign: 'left', // Align title to the left
            }}
          >
            {announcement.title}
          </h1>
        </div>
        <div className="col-12">
          <p
            className="mb-4"
            style={{
              fontSize: '1.2rem',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap', // Preserve line breaks and spaces
              textAlign: 'left', // Align content to the left
            }}
          >
            {announcement.content}
          </p>
        </div>
        <div className="col-12">
          <hr />
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <p className="mb-1">
                <FaCalendarAlt className="me-2 text-primary" />
                <strong>Created At:</strong> {new Date(announcement.createdAt).toLocaleDateString('en-GB')}
              </p>
              <p>
                <FaClock className="me-2 text-primary" />
                <strong>Time:</strong> {new Date(announcement.createdAt).toLocaleTimeString()}
              </p>
            </div>
            <div>
              <p className="mb-1">
                <FaEdit className="me-2 text-warning" />
                <strong>Last Updated:</strong> {new Date(announcement.lastUpdatedAt).toLocaleDateString('en-GB')}
              </p>
              <p>
                <FaClock className="me-2 text-warning" />
                <strong>Time:</strong> {new Date(announcement.lastUpdatedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementDetails;