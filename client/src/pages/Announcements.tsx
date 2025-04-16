import React, { useEffect, useState } from 'react';
import api from '../services/api';
import AnnouncementCard from '../components/AnnouncementsCard/AnnouncementsCards';
import 'bootstrap/dist/css/bootstrap.min.css';
import Announcement from '../types/Announcement';

const Announcements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalData, setModalData] = useState<Partial<Announcement>>({});
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const fetchAnnouncements = async () => {
    try {
      const response = await api.get('/announcement');
      const sortedAnnouncements = response.data.sort(
        (a: Announcement, b: Announcement) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setAnnouncements(sortedAnnouncements);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch announcements.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/announcement/${id}`);
      fetchAnnouncements();
    } catch (err) {
      alert('Failed to delete announcement.');
    }
  };

  const handleSave = async () => {
    try {
      if (isEditing && modalData._id) {
        await api.put(`/announcement/${modalData._id}`, modalData);
      } else {
        await api.post('/announcement', modalData);
      }
      setShowModal(false);
      setModalData({});
      setIsEditing(false);
      fetchAnnouncements();
    } catch (err) {
      alert('Failed to save announcement.');
    }
  };

  const openModal = (announcement?: Announcement) => {
    setModalData(announcement || { title: '', content: '' });
    setIsEditing(!!announcement);
    setShowModal(true);
  };

  if (loading) {
    return <div className="loading">Loading announcements...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="container mt-4">
      <h1 className="text-center mb-4">Announcements</h1>
      <div className="d-flex justify-content-center mb-3">
        <button className="btn btn-success" onClick={() => openModal()}>Add Announcement</button>
      </div>
      {announcements.length === 0 ? (
        <p className="text-center">No announcements available.</p>
      ) : (
        <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-3">
          {announcements.map((announcement) => (
            <div
              key={announcement._id}
              className="col"
            //   onClick={() => navigate(`/announcement/${announcement._id}`)}
              style={{ cursor: 'pointer' }}
            >
              <AnnouncementCard
                announcement={announcement}
                onEdit={openModal}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal show d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{isEditing ? 'Edit Announcement' : 'Add Announcement'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    className="form-control"
                    value={modalData.title || ''}
                    onChange={(e) => setModalData({ ...modalData, title: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Content</label>
                  <textarea
                    className="form-control"
                    value={modalData.content || ''}
                    onChange={(e) => setModalData({ ...modalData, content: e.target.value })}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" onClick={handleSave}>Save</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;