import React from 'react';
import { Card } from 'react-bootstrap';
import './StudentCard.css';

interface StudentCardProps {
    className?: string;
    studentId: string;
    studentName: string;
    level: number;
    subjects: string[];
}

const StudentCard: React.FC<StudentCardProps> = ({ className, studentId, studentName, level, subjects }) => {
    console.log(subjects);
    return (
        <Card className={`card ${className}`}>
            <Card.Body className="card-body">
                <Card.Title className="card-title">{studentName}</Card.Title>
                <Card.Text className="card-text">
                    <span className="highlight">ID: {studentId}</span> <br/>
                    <span className="highlight">Level: {level}</span> <br/>
                    <span className="highlight">Subjects: {subjects.join(', ')}</span> <br/>
                </Card.Text>
            </Card.Body>
        </Card>
    );
};

export default StudentCard;