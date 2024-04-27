import React from 'react';
import { Card } from 'react-bootstrap';
import './TeacherCard.css';

interface TeacherCardProps {
    className?: string;
    teacherId: string;
    teacherName: string;
    role: string;
    subjects: { _id: string, name: string, level: number }[];
}

const TeacherCard: React.FC<TeacherCardProps> = ({ className, teacherId, teacherName, role, subjects }) => {
    const subjectsByLevel = subjects.reduce((acc, subject) => {
        if (!acc[subject.level]) {
            acc[subject.level] = [];
        }
        acc[subject.level].push(subject.name);
        return acc;
    }, {} as Record<number, string[]>);

    function formatLevel(level: number): string {
        switch(level) {
            case 1:
                return '1st';
            case 2:
                return '2nd';
            case 3:
                return '3rd';
            default:
                return `${level}th`;
        }
    }

    return (
        <Card className={`card ${className}`}>
            <div className="card-image" style={{backgroundImage: `url(https://via.placeholder.com/150?text=${teacherName.charAt(0)})`}}></div>
            <Card.Body className="card-body">
                <Card.Title
                    className="card-title">{role === 'doctor' ? `Dr. ${teacherName}` : `TA. ${teacherName}`}</Card.Title>
                <Card.Text className="card-text">
                    <span className="highlight">Role: {role === 'doctor' ? 'Doctor' : 'Teaching Assistant'}</span> <br/>
                    {Object.keys(subjectsByLevel).map(level => (
                        <span key={level}>
                            {formatLevel(parseInt(level))} Level Subjects: {subjectsByLevel[level].join(', ')} <br/>
                         </span>
                    ))}
                </Card.Text>
            </Card.Body>
        </Card>
    );
};

export default TeacherCard;