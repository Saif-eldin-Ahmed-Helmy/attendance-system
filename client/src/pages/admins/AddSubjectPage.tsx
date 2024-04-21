import React, { useState, useEffect } from 'react';
import { Form, Button, DropdownButton, Dropdown } from 'react-bootstrap';

interface User {
    _id: string;
    name: string;
}

const AddSubjectPage: React.FC = () => {
    const [name, setName] = useState('');
    const [level, setLevel] = useState(1);
    const [doctor, setDoctor] = useState<User | null>(null);
    const [teachingAssistant, setTeachingAssistant] = useState<User | null>(null);
    const [doctors, setDoctors] = useState<User[]>([]);
    const [assistants, setAssistants] = useState<User[]>([]);
    const [numGroups, setNumGroups] = useState(1);
    const [numSections, setNumSections] = useState(0);
    const [groupSchedules, setGroupSchedules] = useState(Array.from({length: numGroups}, () => ({ day: '', start: '', end: '' })));
    const [sectionSchedules, setSectionSchedules] = useState(Array.from({length: numSections}, () => ({ day: '', start: '', end: '' })));
    const [startWeek, setStartWeek] = useState('');

    const handleNumGroupsChange = (num: number) => {
        setNumGroups(num);
        setGroupSchedules(prevGroupSchedules => {
            const newGroupSchedules = [...prevGroupSchedules];
            while (newGroupSchedules.length < num) {
                newGroupSchedules.push({ day: '', start: '', end: '' });
            }
            while (newGroupSchedules.length > num) {
                newGroupSchedules.pop();
            }
            return newGroupSchedules;
        });
    };

    const handleNumSectionsChange = (num: number) => {
        setNumSections(num);
        setSectionSchedules(prevSectionSchedules => {
            const newSectionSchedules = [...prevSectionSchedules];
            while (newSectionSchedules.length < num) {
                newSectionSchedules.push({ day: '', start: '', end: '' });
            }
            while (newSectionSchedules.length > num) {
                newSectionSchedules.pop();
            }
            return newSectionSchedules;
        });
    };

    const handleGroupScheduleChange = (index: number, field: keyof typeof groupSchedules[index], value: string) => {
        setGroupSchedules(prevGroupSchedules => {
            const newGroupSchedules = [...prevGroupSchedules];
            if (!newGroupSchedules[index]) {
                newGroupSchedules[index] = { day: '', start: '', end: '' };
            }
            newGroupSchedules[index][field] = value;
            return newGroupSchedules;
        });
    };

    const handleSectionScheduleChange = (index: number, field: keyof typeof sectionSchedules[index], value: string) => {
        setSectionSchedules(prevSectionSchedules => {
            const newSectionSchedules = [...prevSectionSchedules];
            if (!newSectionSchedules[index]) {
                newSectionSchedules[index] = { day: '', start: '', end: '' };
            }
            newSectionSchedules[index][field] = value;
            return newSectionSchedules;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const response = await fetch('http://localhost:3001/api/subjects', {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, level, doctor: doctor ? doctor._id : null, teachingAssistant: teachingAssistant ? teachingAssistant._id : null, groups: groupSchedules, sections: sectionSchedules, startWeek })
        });

        if (response.ok) {
            alert('Subject added successfully');
        } else {
            alert('Error adding subject');
        }
    };

    useEffect(() => {
        fetch('http://localhost:3001/api/users/doctors', {
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => setDoctors(data))
            .catch(error => console.error(error));
    }, []);

    useEffect(() => {
        fetch('http://localhost:3001/api/users/assistants', {
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => setAssistants(data))
            .catch(error => console.error(error));
    }, []);

    return (
        <Form onSubmit={handleSubmit}>
            <Form.Group controlId="name">
                <Form.Label>Subject Name</Form.Label>
                <Form.Control type="text" value={name} onChange={e => setName(e.target.value)} />
            </Form.Group>
            <Form.Group controlId="level">
                <Form.Label>Level</Form.Label>
                <Form.Control as="select" value={level} onChange={e => setLevel(parseInt(e.target.value))}>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                </Form.Control>
            </Form.Group>
            <Form.Group controlId="doctor">
                <Form.Label>Doctor</Form.Label>
                <Form.Control as="select" value={doctor?._id || ''} onChange={e => setDoctor(doctors.find(doc => doc._id === e.target.value) || null)}>
                    <option value="">Select a doctor</option>
                    {doctors.map((doc, index) => (
                        <option key={index} value={doc._id}>{doc.name}</option>
                    ))}
                </Form.Control>
            </Form.Group>
            <Form.Group controlId="teachingAssistant">
                <Form.Label>Teaching Assistant</Form.Label>
                <Form.Control as="select" value={teachingAssistant?._id || ''} onChange={e => setTeachingAssistant(assistants.find(assistant => assistant._id === e.target.value) || null)}>
                    <option value="">Select a teaching assistant (optional)</option>
                    {assistants.map((assistant, index) => (
                        <option key={index} value={assistant._id}>{assistant.name}</option>
                    ))}
                </Form.Control>
            </Form.Group>
            <Form.Group controlId="startWeek">
                <Form.Label>Start Week</Form.Label>
                <Form.Control type="date" value={startWeek} onChange={e => setStartWeek(e.target.value)} />
            </Form.Group>
            <Form.Group controlId="numGroups">
                <Form.Label>Number of Groups</Form.Label>
                <DropdownButton id="dropdown-basic-button" title={numGroups}>
                    {[1, 2].map((num, index) => (
                        <Dropdown.Item key={index} onClick={() => handleNumGroupsChange(num)}>{num}</Dropdown.Item>
                    ))}
                </DropdownButton>
            </Form.Group>
            {groupSchedules.map((schedule, index) => (
                <div key={`group-${index}`} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Form.Label style={{paddingRight: 50, width: '30%'}}>Group {index + 1} Schedule</Form.Label>
                    <DropdownButton style={{paddingRight: 20}} id={`group-day-dropdown-${index}`} title={schedule.day || "Day"}>
                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].map((day, dayIndex) => (
                            <Dropdown.Item key={`group-${index}-day-${dayIndex}`} onClick={() => handleGroupScheduleChange(index, 'day', day)}>{day}</Dropdown.Item>
                        ))}
                    </DropdownButton>
                    <Form.Control type="text" placeholder="Start Time" pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" value={schedule.start} onChange={e => handleGroupScheduleChange(index, 'start', e.target.value)} />
                    <Form.Control type="text" placeholder="End Time" pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" value={schedule.end} onChange={e => handleGroupScheduleChange(index, 'end', e.target.value)} />
                </div>
            ))}
            <Form.Group controlId="numSections">
                <Form.Label>Number of Sections</Form.Label>
                <DropdownButton id="dropdown-basic-button" title={numSections}>
                    {[0, 1, 2, 3, 4].map((num, index) => (
                        <Dropdown.Item key={index} onClick={() => handleNumSectionsChange(num)}>{num}</Dropdown.Item>
                    ))}
                </DropdownButton>
            </Form.Group>
            {sectionSchedules.map((schedule, index) => (
                <div key={`section-${index}`} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Form.Label style={{paddingRight: 50, width: '30%'}}>Section {index + 1} Schedule</Form.Label>
                    <DropdownButton style={{paddingRight: 20}} id={`section-day-dropdown-${index}`} title={schedule.day || "Day"}>
                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].map((day, dayIndex) => (
                            <Dropdown.Item key={`section-${index}-day-${dayIndex}`} onClick={() => handleSectionScheduleChange(index, 'day', day)}>{day}</Dropdown.Item>
                        ))}
                    </DropdownButton>
                    <Form.Control type="text" placeholder="Start Time" pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" value={schedule.start} onChange={e => handleSectionScheduleChange(index, 'start', e.target.value)} />
                    <Form.Control type="text" placeholder="End Time" pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" value={schedule.end} onChange={e => handleSectionScheduleChange(index, 'end', e.target.value)} />
                </div>
            ))}
            <Button variant="primary" type="submit">Add Subject</Button>
        </Form>
    );
};

export default AddSubjectPage;