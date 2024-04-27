import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {Card, ListGroup, Accordion, Table, Button} from 'react-bootstrap';
import './StudentDetailPage.css';

interface Schedule {
    day: string;
    startTime: string;
    endTime: string;
    _id: string;
}

interface Subject {
    subject: {
        _id: string;
        name: string;
    };
    group: number;
    section: number;
}

interface Attendance {
    student: {
        _id: string;
        id: string;
        name: string;
    };
    lectureAttendanceTime: string | null;
    sectionAttendanceTime: string | null;
    subject: string;
    group: number | null;
    section: number | null;
    week: number;
}

interface StudentDetail {
    _id: string;
    name: string;
    id: string;
    level: number;
    subjects: Subject[];
}

const StudentDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null);
    const [attendances, setAttendances] = useState<Attendance[]>([]);

    useEffect(() => {
        fetch(`http://localhost:3001/api/students/view/${id}`, {
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => {
                setStudentDetail(data.student);
                if (data.attendances) {
                    setAttendances(data.attendances);
                }
            })
            .catch(error => console.error(error));
    }, [id]);

    if (!studentDetail) {
        return <div>Loading...</div>;
    }

    const weeksPerSubject = studentDetail.subjects.map(subject => {
        const now = new Date();
        const startWeekDate = new Date(subject.subject.startWeek);
        return Math.floor((now.getTime() - startWeekDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    });

    const maxWeeks = Math.max(...weeksPerSubject);

    const weeksMap: Record<string, Attendance[]> = {};

    for (let weekNumber = 1; weekNumber <= maxWeeks; weekNumber++) {
        weeksMap[weekNumber.toString()] = [];
    }

    attendances.forEach(attendance => {
        weeksMap[attendance.week.toString()].push(attendance);
    });c

    Object.keys(weeksMap).forEach(weekNumber => {
        weeksMap[weekNumber].sort((a, b) => a.student.id.localeCompare(b.student.id));
    });

    const totalAttendanceMap: Record<string, { lectureAttendanceCount: number, sectionAttendanceCount: number }> = {};

    Object.keys(weeksMap).forEach(weekNumber => {
        weeksMap[weekNumber].forEach(attendance => {
            if (!totalAttendanceMap[attendance.student._id]) {
                totalAttendanceMap[attendance.student._id] = { lectureAttendanceCount: 0, sectionAttendanceCount: 0 };
            }
            if (attendance.lectureAttendanceTime) {
                totalAttendanceMap[attendance.student._id].lectureAttendanceCount++;
            }
            if (attendance.sectionAttendanceTime) {
                totalAttendanceMap[attendance.student._id].sectionAttendanceCount++;
            }
        });
    });

    return (
        <div className="card-container">
            <Card>
                <Card.Header className="header">{studentDetail.name}</Card.Header>
                <ListGroup variant="flush">
                    <ListGroup.Item>ID: {studentDetail.id}</ListGroup.Item>
                    <ListGroup.Item>Level: {studentDetail.level}</ListGroup.Item>
                    {studentDetail.subjects.map((subject, index) => (
                        <ListGroup.Item key={index}>Subject {index + 1}: {subject.subject.name}, Group: {subject.group}, Section: {subject.section}</ListGroup.Item>
                    ))}
                </ListGroup>
            </Card>
            <Accordion className={"accordion-container"} defaultActiveKey="0">
                <Accordion.Item eventKey="total">
                    <Accordion.Header>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <h5>Total Attendance</h5>
                            <Button variant="outline-primary" onClick={() => downloadExcel('total')}>Download Excel</Button>
                        </div>
                    </Accordion.Header>
                    <Accordion.Body>
                        <Table striped bordered hover>
                            <thead>
                            <tr>
                                <th>Subject</th>
                                <th>Group</th>
                                <th>Attendance (Count)</th>
                                <th>Mark</th>
                                <th>Section</th>
                                <th>Attendance (Count)</th>
                                <th>Mark</th>
                                <th>Attendance Percentage</th>
                                <th>Total Mark</th>
                            </tr>
                            </thead>
                            <tbody>
                            {studentDetail.subjects.map((subject, index) => (
                                <tr key={index}>
                                    <td>{subject.subject.name}</td>
                                    <td>{subject.group}</td>
                                    <td>{totalAttendanceMap[subject.subject._id]?.lectureAttendanceCount || 0}</td>
                                    <td>{/* Calculate and display the lecture mark here */}</td>
                                    <td>{subject.section}</td>
                                    <td>{totalAttendanceMap[subject.subject._id]?.sectionAttendanceCount || 0}</td>
                                    <td>{/* Calculate and display the section mark here */}</td>
                                    <td>{/* Calculate and display the attendance percentage here */}</td>
                                    <td>{/* Calculate and display the total mark here */}</td>
                                </tr>
                            ))}
                            </tbody>
                        </Table>
                    </Accordion.Body>
                </Accordion.Item>
                {Object.keys(weeksMap).map((weekNumber: string) => (
                    <Accordion.Item eventKey={weekNumber} key={weekNumber}>
                        <Accordion.Header>
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                <h5>Week {weekNumber}</h5>
                                <Button variant="outline-primary" onClick={() => downloadExcel(weekNumber)}>Download Excel</Button>
                            </div>
                        </Accordion.Header>
                        <Accordion.Body>
                            <Table striped bordered hover>
                                <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Group</th>
                                    <th>Attendance (Time/Absent/Upcoming)</th>
                                    <th>Section</th>
                                    <th>Attendance (Time/Absent/Upcoming)</th>
                                </tr>
                                </thead>
                                <tbody>
                                {studentDetail.subjects.map((subject, index) => {
                                    const attendancesForSubject = weeksMap[weekNumber].filter(attendance => attendance.subject === subject.subject._id);
                                    return attendancesForSubject.map((attendance, index) => (
                                        <tr key={index}>
                                            <td>{subject.subject.name}</td>
                                            <td>{subject.group}</td>
                                            <td>{/* Calculate and display the lecture attendance here */}</td>
                                            <td>{attendance.section}</td>
                                            <td>{/* Calculate and display the section attendance here */}</td>
                                        </tr>
                                    ));
                                })}
                                </tbody>
                            </Table>
                        </Accordion.Body>
                    </Accordion.Item>
                ))}
            </Accordion>
        </div>
    );
};

export default StudentDetailPage;