import {useState, useEffect, useMemo} from 'react';
import axios from 'axios';

interface Subject {
    _id: string;
    name: string;
    groupsCount: number;
    sectionsCount: number;
}

const UploadPage = () => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [selectedGroup, setSelectedGroup] = useState<string>('');
    const [selectedSection, setSelectedSection] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        axios.get('http://localhost:3001/api/subjects/list', {withCredentials: true})
            .then(response => {
                const filteredSubjects = response.data.map((subject: Subject) => ({
                    _id: subject._id,
                    name: subject.name,
                    groupsCount: subject.groupsCount,
                    sectionsCount: subject.sectionsCount
                }));
                setSubjects(filteredSubjects);
            })
            .catch(error => console.error(error));
    }, []);

    const selectedSubjectDetail = useMemo(() => {
        return subjects.find(subject => subject.name === selectedSubject);
    }, [selectedSubject, subjects]);

    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
    };

    const handleSubjectChange = (event) => {
        setSelectedSubject(event.target.value);
        setSelectedGroup('');
        setSelectedSection('');
    };

    const handleGroupChange = (event) => {
        setSelectedGroup(event.target.value);
        setSelectedSection('');
    };

    const handleSectionChange = (event) => {
        setSelectedSection(event.target.value);
        setSelectedGroup('');
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        const formData = new FormData();
        formData.append('file', file);
        formData.append('subject', selectedSubject);
        formData.append('group', selectedGroup);
        formData.append('section', selectedSection);

        axios.post('http://localhost:3001/api/students/upload', formData)
            .then(response => alert(`File uploaded successfully, ${response}`))
            .catch(error => console.error(error));
    };

    return (
        <form onSubmit={handleSubmit}>
            <input type="file" accept="text/plain" onChange={handleFileChange} required />
            <select value={selectedSubject} onChange={handleSubjectChange} required>
                <option value="">Select a subject</option>
                {subjects.map(subject => (
                    <option key={subject._id} value={subject._id}>{subject.name}</option>
                ))}
            </select>
            <select value={selectedGroup} onChange={handleGroupChange}>
                <option value="">Select a group (optional)</option>
                {Array.from({ length: selectedSubjectDetail?.groupsCount || 0 }, (_, i) => i + 1).map(group => (
                    <option key={group} value={group}>Group {group}</option>
                ))}
            </select>
            <select value={selectedSection} onChange={handleSectionChange}>
                <option value="">Select a section (optional)</option>
                {Array.from({ length: selectedSubjectDetail?.sectionsCount || 0 }, (_, i) => i + 1).map(section => (
                    <option key={section} value={section}>Section {section}</option>
                ))}
            </select>
            <button type="submit">Upload</button>
        </form>
    );
};

export default UploadPage;