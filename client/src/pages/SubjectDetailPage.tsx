import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {Card, ListGroup, Accordion, Table, Button} from 'react-bootstrap';
import './SubjectDetailPage.css';
import {toast, ToastContainer} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import io from 'socket.io-client';

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
    lectureAttendanceTime: string | null;
    sectionAttendanceTime: string | null;
    subject: string;
    group: number | null;
    section: number | null;
    week: number;
}

const SubjectDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [subjectDetail, setSubjectDetail] = useState<SubjectDetail | null>(null);
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [enrolledStudents, setEnrolledStudents] = useState<string[]>([]);

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:3001/');

        ws.onopen = function() {
            console.log('Connected to WebSocket server');
        };

        ws.onmessage = function(event) {
            console.log('Message received from server:', event.data);
            if (event.data.startsWith('SUCCESS|')) {
                toast.success(event.data.substring(8), {
                    position: toast.POSITION.BOTTOM_RIGHT,
                    autoClose: 5000
                });
            }
            else if (event.data.startsWith("ERROR|")) {
                toast.error(event.data.substring(6), {
                    position: toast.POSITION.BOTTOM_RIGHT,
                    autoClose: 5000
                });
            }
        };

        ws.onclose = function(event) {
            console.log('Connection closed:', event);
        };

        ws.onerror = function(error) {
            console.error('WebSocket error:', error);
        };

        // Cleanup function
        return () => {
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
        };
    }, []);

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
                if (data.enrolledStudents) {
                    setEnrolledStudents(data.enrolledStudents);
                }
            })
            .catch(error => console.error(error));
    }, [id]);

    if (!subjectDetail) {
        return <div>Loading...</div>;
    }

    const now = new Date();
    const startWeekDate = new Date(subjectDetail.startWeek);
    const currentWeek = Math.floor((now.getTime() - startWeekDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

    const weeksMap: Record<string, Attendance[]> = {};

    for (let weekNumber = 1; weekNumber <= currentWeek; weekNumber++) {
        weeksMap[weekNumber.toString()] = [];
    }

    attendances.forEach(attendance => {
        weeksMap[attendance.week.toString()].push(attendance);
    });

    enrolledStudents.forEach(student => {
        Object.keys(weeksMap).forEach(weekNumber => {
            if (!weeksMap[weekNumber].find(attendance => attendance.student._id === student._id)) {
                weeksMap[weekNumber].push({
                    student: {
                        _id: student._id,
                        id: student.id,
                        name: student.name
                    },
                    lectureAttendanceTime: null,
                    sectionAttendanceTime: null,
                    subject: student.subject,
                    group: student.group,
                    section: student.section,
                    week: parseInt(weekNumber)
                });
            }
        });
    });

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

    function downloadExcel(week: string) {
        fetch(`http://localhost:3001/api/subjects/view/${id}/attendance/excel/${week}`)
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${subjectDetail.name} (Dr. ${subjectDetail.doctor}) - ${week === 'total' ? 'Total' : `Week ${week}`}.xlsx`;
                a.click();
            });
    }

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
        <div className="card-container">
            <ToastContainer/>
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
                <Accordion.Item eventKey="total">
                    <Accordion.Header>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            Total
                            <Button style={{marginRight: '20px'}} variant="primary" size="sm" onClick={(event) => {event.stopPropagation(); downloadExcel('total');}}>Excel</Button>
                        </div>
                    </Accordion.Header>
                    <Accordion.Body>
                        <Table striped bordered hover>
                            <thead>
                            <tr>
                                <th>Student ID</th>
                                <th>Name</th>
                                <th>Group</th>
                                <th>Attendance</th>
                                <th>Mark</th>
                                <th>Section</th>
                                <th>Attendance</th>
                                <th>Mark</th>
                                <th>Attendance Percentage</th>
                                <th>Total Mark</th>
                            </tr>
                            </thead>
                            <tbody>
                            {Object.keys(totalAttendanceMap).map(studentId => {
                                const now = new Date();
                                const todayDayOfWeek = now.getDay();
                                const todayTime = now.getHours() * 60 + now.getMinutes();
                                const currentWeek = Math.floor((now.getTime() - new Date(subjectDetail.startWeek).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

                                const student = enrolledStudents.find(student => student._id === studentId);
                                const lectureAttendanceCount = totalAttendanceMap[studentId].lectureAttendanceCount;
                                const sectionAttendanceCount = totalAttendanceMap[studentId].sectionAttendanceCount;
                                const lectureMark = Math.ceil((lectureAttendanceCount / currentWeek) * 5);
                                const sectionMark = Math.ceil((sectionAttendanceCount / currentWeek) * 5);
                                const totalMark = lectureMark + sectionMark;

                                const groupSchedule = subjectDetail.groups.find(group => group.groupNumber === student.group)?.schedule;
                                const sectionSchedule = subjectDetail.sections.find(section => section.sectionNumber === student.section)?.schedule;

                                const groupDayOfWeek = daysOfWeek.indexOf(groupSchedule?.day || '');
                                const groupTime = groupSchedule ? parseInt(groupSchedule.startTime.split(':')[0]) * 60 + parseInt(groupSchedule.startTime.split(':')[1]) : Infinity;

                                const sectionDayOfWeek = daysOfWeek.indexOf(sectionSchedule?.day || '');
                                const sectionTime = sectionSchedule ? parseInt(sectionSchedule.startTime.split(':')[0]) * 60 + parseInt(sectionSchedule.startTime.split(':')[1]) : Infinity;

                                const isFutureGroup = (todayDayOfWeek < groupDayOfWeek || (todayDayOfWeek === groupDayOfWeek && todayTime < groupTime));
                                const isFutureSection = (todayDayOfWeek < sectionDayOfWeek || (todayDayOfWeek === sectionDayOfWeek && todayTime < sectionTime));

                                const totalLecturesCount = isFutureGroup ? currentWeek - 1 : currentWeek;
                                const totalSectionsCount = isFutureSection ? currentWeek - 1 : currentWeek;

                                const percentage = Math.round(((lectureAttendanceCount + sectionAttendanceCount) / (totalLecturesCount + totalSectionsCount)) * 100);
                                return (
                                    <tr key={studentId}>
                                        <td>{student.id}</td>
                                        <td>{student.name}</td>
                                        <td>{`Group ${student.group}`}</td>
                                        <td>{lectureAttendanceCount}</td>
                                        <td>{lectureMark}</td>
                                        <td>{`Section ${student.section}`}</td>
                                        <td>{sectionAttendanceCount}</td>
                                        <td>{sectionMark}</td>
                                        <td>{`${percentage}%`}</td>
                                        <td>{totalMark}</td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </Table>
                    </Accordion.Body>
                </Accordion.Item>
                {Object.keys(weeksMap).map((weekNumber: string) => (
                    <Accordion.Item eventKey={weekNumber} key={weekNumber}>
                        <Accordion.Header>
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                Week {weekNumber}
                                <Button style={{marginRight: '20px'}} variant="primary" size="sm" onClick={(event) => {event.stopPropagation(); downloadExcel(weekNumber);}}>Excel</Button>
                            </div>
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
                                {weeksMap[weekNumber].map((attendance, i) => {
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

                                    const isFutureGroup = attendance.week >= currentWeek && (todayDayOfWeek < groupDayOfWeek || (todayDayOfWeek === groupDayOfWeek && todayTime < groupTime));
                                    const isFutureSection = attendance.week >= currentWeek && (todayDayOfWeek < sectionDayOfWeek || (todayDayOfWeek === sectionDayOfWeek && todayTime < sectionTime));

                                    const lectureAttendanceTime = attendance.lectureAttendanceTime ? new Date(attendance.lectureAttendanceTime) : null;
                                    const sectionAttendanceTime = attendance.sectionAttendanceTime ? new Date(attendance.sectionAttendanceTime) : null;

                                    const lectureAttendanceDateTime = lectureAttendanceTime ? `${lectureAttendanceTime.toLocaleDateString()}, ${lectureAttendanceTime.toLocaleTimeString()}` : null;
                                    const sectionAttendanceDateTime = sectionAttendanceTime ? `${sectionAttendanceTime.toLocaleDateString()}, ${sectionAttendanceTime.toLocaleTimeString()}` : null;
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