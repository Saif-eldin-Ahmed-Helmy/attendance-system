import React from 'react';
import { Card } from 'react-bootstrap';
import './SubjectCard.css';
import {useNavigate} from "react-router-dom";


interface SubjectCardProps {
    className?: string;
    subjectId: string;
    subjectName: string;
    doctorName: string;
    assistantName: string;
    studentsCount: number;
    level: number;
}

const SubjectCard: React.FC<SubjectCardProps> = ({ className, subjectId, subjectName, doctorName, assistantName, studentsCount, level }) => {
    const navigate = useNavigate();

    const handleClick = () => {
        navigate(`/subject/${subjectId}`);
    };

    return (
        <Card className={`card ${className}`} onClick={handleClick}>
            <div className="card-image" style={{backgroundImage: `url(https://via.placeholder.com/150?text=${doctorName.charAt(0)})`}}></div>
            <Card.Body className="card-body">
                <Card.Title className="card-title">{subjectName}</Card.Title>
                <Card.Text className="card-text">
                    <span className="highlight">Dr: {doctorName}</span> <br/>
                    {assistantName && <span className="highlight-assistant">TA: {assistantName}</span>} <br/>
                </Card.Text>
                <div className="bottomLine">
                    <Card.Text className="level">Level: {level}</Card.Text>
                    <Card.Text className="studentsCount">Students: {studentsCount}</Card.Text>
                </div>
            </Card.Body>
        </Card>
    );
};

export default SubjectCard;