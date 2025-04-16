import Subject from "./Subject";

interface Material {
    _id: string;
    subjectId: Subject;
    name: string;
    link: string;
    createdAt: string;
}

export default Material;