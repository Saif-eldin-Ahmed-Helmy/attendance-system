import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {Card, ListGroup, Accordion, Table} from 'react-bootstrap';
import './SubjectDetailPage.css';

interface Schedule {
    day: string;
    startTime: string;
    endTime: string;
    _id: string;
}

interface Group {
    groupNumber: number;
    schedule: Schedule;
    _id: string;
}

interface Section {
    sectionNumber: number;
    schedule: Schedule;
    _id: string;
}

interface SubjectDetail {
    _id: string;
    name: string;
    level: number;
    doctor: string;
    teachingAssistant: string;
    groups: Group[];
    sections: Section[];
    startWeek: string;
    __v: number;
}

interface Attendance {
    student: {
        _id: string;
        id: string;
        name: string;
    };
    lectureAttendanceTime: string;
    sectionAttendanceTime: string;
    subject: string;
    group: number | null;
    section: number | null;
    week: number;
}

const SubjectDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [subjectDetail, setSubjectDetail] = useState<SubjectDetail | null>(null);
    const [attendances, setAttendances] = useState<Attendance[]>([]);

    useEffect(() => {
        fetch(`http://localhost:3001/api/subjects/view/${id}`, {
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => {
                setSubjectDetail(data.subject);
                if (data.attendances) {
                    setAttendances(data.attendances);
                }
            })
            .catch(error => console.error(error));
    }, [id]);

    if (!subjectDetail) {
        return <div>Loading...</div>;
    }

    const weeks = attendances.reduce((acc: Attendance[][], attendance: Attendance) => {
        const weekNumber = attendance.week - 1;
        if (!acc[weekNumber]) {
            acc[weekNumber] = [];
        }
        acc[weekNumber].push(attendance);
        return acc;
    }, []);

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
        <div className="card-container">
            <Card>
                <Card.Header className="header">{subjectDetail.name}</Card.Header>
                <ListGroup variant="flush">
                    <ListGroup.Item>Level: {subjectDetail.level}</ListGroup.Item>
                    <ListGroup.Item>Doctor: {subjectDetail.doctor}</ListGroup.Item>
                    <ListGroup.Item>Teaching Assistant: {subjectDetail.teachingAssistant}</ListGroup.Item>
                    {subjectDetail.groups.map((group, index) => (
                        <ListGroup.Item key={index}>Group {group.groupNumber}: {group.schedule.day}, {group.schedule.startTime} - {group.schedule.endTime}</ListGroup.Item>
                    ))}
                    {subjectDetail.sections.map((section, index) => (
                        <ListGroup.Item key={index}>Section {section.sectionNumber}: {section.schedule.day}, {section.schedule.startTime} - {section.schedule.endTime}</ListGroup.Item>
                    ))}
                </ListGroup>
            </Card>
            <Accordion className={"accordion-container"} defaultActiveKey="0">
                {weeks.map((week: Attendance[], index) => (
                    <Accordion.Item eventKey={index.toString()} key={index}>
                        <Accordion.Header>
                            Week {index + 1}
                        </Accordion.Header>
                        <Accordion.Body>
                            <Table striped bordered hover>
                                <thead>
                                <tr>
                                    <th>Student ID</th>
                                    <th>Name</th>
                                    <th>Group</th>
                                    <th>Attendance</th>
                                    <th>Section</th>
                                    <th>Attendance</th>
                                </tr>
                                </thead>
                                <tbody>
                                {week.map((attendance, i) => {
                                    const now = new Date();
                                    const todayDayOfWeek = now.getDay();
                                    const todayTime = now.getHours() * 60 + now.getMinutes();
                                    const currentWeek = Math.floor((now.getTime() - new Date(subjectDetail.startWeek).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

                                    const groupSchedule = subjectDetail.groups.find(group => group.groupNumber === attendance.group)?.schedule;
                                    const sectionSchedule = subjectDetail.sections.find(section => section.sectionNumber === attendance.section)?.schedule;

                                    const groupDayOfWeek = daysOfWeek.indexOf(groupSchedule?.day || '');
                                    const groupTime = groupSchedule ? parseInt(groupSchedule.startTime.split(':')[0]) * 60 + parseInt(groupSchedule.startTime.split(':')[1]) : Infinity;

                                    const sectionDayOfWeek = daysOfWeek.indexOf(sectionSchedule?.day || '');
                                    const sectionTime = sectionSchedule ? parseInt(sectionSchedule.startTime.split(':')[0]) * 60 + parseInt(sectionSchedule.startTime.split(':')[1]) : Infinity;

                                    const isFutureGroup = todayDayOfWeek < groupDayOfWeek || (todayDayOfWeek === groupDayOfWeek && todayTime < groupTime);
                                    const isFutureSection = attendance.week >= currentWeek && (todayDayOfWeek < sectionDayOfWeek || (todayDayOfWeek === sectionDayOfWeek && todayTime < sectionTime));

                                    const lectureAttendanceTime = new Date(attendance.lectureAttendanceTime);
                                    const sectionAttendanceTime = new Date(attendance.sectionAttendanceTime);

                                    const lectureAttendanceDateTime = `${lectureAttendanceTime.toLocaleDateString()}, ${lectureAttendanceTime.toLocaleTimeString()}`;
                                    const sectionAttendanceDateTime = `${sectionAttendanceTime.toLocaleDateString()}, ${sectionAttendanceTime.toLocaleTimeString()}`;
                                    const absentStyle = { color: '#ff1e00' };
                                    const upcomingStyle = { color: '#003cff' };
                                    const dateStyle = { color: '#468d46' };

                                    return (
                                        <tr key={i}>
                                            <td>{attendance.student.id}</td>
                                            <td>{attendance.student.name}</td>
                                            <td>{`Group ${attendance.group}`}</td>
                                            <td style={attendance.lectureAttendanceTime ? dateStyle : (isFutureGroup ? upcomingStyle : absentStyle)}>
                                                {attendance.lectureAttendanceTime ? lectureAttendanceDateTime : (isFutureGroup ? 'Upcoming' : 'Absent')}
                                            </td>
                                            <td>{`Section ${attendance.section}`}</td>
                                            <td style={attendance.sectionAttendanceTime ? dateStyle : (isFutureSection ? upcomingStyle : absentStyle)}>
                                                {attendance.sectionAttendanceTime ? sectionAttendanceDateTime : (isFutureSection ? 'Upcoming' : 'Absent')}
                                            </td>
                                        </tr>
                                    );
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

export default SubjectDetailPage;