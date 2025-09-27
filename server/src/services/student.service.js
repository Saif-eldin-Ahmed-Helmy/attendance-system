const Student = require('../../models/Student');
const Subject = require('../../models/Subject');
const Attendance = require('../../models/Attendance');
const AppError = require('../utils/AppError');

/**
 * Student Service
 * Contains all business logic related to student operations
 */
class StudentService {
  /**
   * Get paginated list of students with filters
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Students list with pagination info
   */
  async getStudents(filters = {}, pagination = { page: 1, limit: 10 }) {
    const { level, search } = filters;
    const { page, limit } = pagination;

    const query = {};

    if (level) query.level = level;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { id: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      Student.find(query)
        .populate('subjects.subject', 'name')
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Student.countDocuments(query)
    ]);

    const maxPages = Math.ceil(total / limit);

    const formattedStudents = students.map(student => ({
      _id: student._id,
      id: student.id,
      name: student.name,
      level: student.level,
      subjects: student.subjects.map(s => s.subject?.name).filter(Boolean)
    }));

    return {
      students: formattedStudents,
      pagination: {
        currentPage: parseInt(page),
        totalPages: maxPages,
        totalItems: total
      }
    };
  }

  /**
   * Get student by ID with detailed information
   * @param {string} studentId - Student ID
   * @returns {Promise<Object>} Student details
   */
  async getStudentById(studentId) {
    const student = await Student.findOne({ id: studentId })
      .populate({
        path: 'subjects.subject',
        populate: {
          path: 'doctor teachingAssistant',
          select: 'name email'
        }
      })
      .lean();

    if (!student) {
      throw new AppError('Student not found', 404, 'STUDENT_NOT_FOUND');
    }

    return student;
  }

  /**
   * Create or update student record
   * @param {Object} studentData - Student data
   * @returns {Promise<Object>} Created/updated student
   */
  async createOrUpdateStudent(studentData) {
    const { name, id, level } = studentData;

    let student = await Student.findOne({ id });

    if (student) {
      student.name = name;
      student.level = level;
    } else {
      student = new Student({ name, id, level });
    }

    await student.save();
    return student;
  }

  /**
   * Process student records from uploaded file
   * @param {Array} studentRecords - Array of student records
   * @param {string} subjectId - Subject ID to enroll students in
   * @param {Object} enrollment - Enrollment details (group, section)
   * @returns {Promise<Object>} Processing results
   */
  async processStudentUpload(studentRecords, subjectId, enrollment = {}) {
    const { group, section } = enrollment;
    let processed = 0;
    let errors = [];

    for (const record of studentRecords) {
      try {
        const { name, id } = record;

        if (!name || !id || id.length < 6) {
          errors.push(`Invalid record: ${JSON.stringify(record)}`);
          continue;
        }

        await this.enrollStudentInSubject(name, id, subjectId, group, section);
        processed++;
      } catch (error) {
        errors.push(`Error processing ${record.id}: ${error.message}`);
      }
    }

    return { processed, errors };
  }

  /**
   * Enroll student in a subject
   * @param {string} name - Student name
   * @param {string} id - Student ID
   * @param {string} subjectId - Subject ID
   * @param {number} group - Group number
   * @param {number} section - Section number
   * @returns {Promise<Object>} Updated student
   */
  async enrollStudentInSubject(name, id, subjectId, group = null, section = null) {
    let student = await Student.findOne({ id }).populate('subjects');

    if (!student) {
      const level = this.determineLevelFromId(id);
      student = new Student({ id, name, level });
    } else {
      student.name = name;
    }

    const existingSubjectIndex = student.subjects.findIndex(
      s => s.subject.toString() === subjectId.toString()
    );

    if (existingSubjectIndex !== -1) {
      if (group) student.subjects[existingSubjectIndex].group = group;
      if (section) student.subjects[existingSubjectIndex].section = section;
    } else {
      student.subjects.push({
        subject: subjectId,
        group: group || null,
        section: section || null
      });
    }

    await student.save();
    return student;
  }

  /**
   * Get student attendance summary
   * @param {string} studentId - Student ID
   * @param {string} subjectId - Subject ID (optional)
   * @returns {Promise<Object>} Attendance summary
   */
  async getStudentAttendance(studentId, subjectId = null) {
    const student = await Student.findOne({ id: studentId });
    if (!student) {
      throw new AppError('Student not found', 404, 'STUDENT_NOT_FOUND');
    }

    const query = { student: student._id };
    if (subjectId) query.subject = subjectId;

    const attendanceRecords = await Attendance.find(query)
      .populate('subject', 'name')
      .sort({ week: 1 });

    return attendanceRecords;
  }

  /**
   * Get students managed by a specific user (for management role)
   * @param {string} userId - User ID of the manager
   * @returns {Promise<Array>} Managed students
   */
  async getManagedStudents(userId) {
    const students = await Student.find({
      $or: [
        { 'subjects.doctor': userId },
        { 'subjects.teachingAssistant': userId }
      ]
    }).populate('subjects.subject', 'name code').lean();

    return students;
  }

  /**
   * Update existing student
   * @param {string} studentId - Student ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated student
   */
  async updateStudent(studentId, updateData) {
    const student = await Student.findOne({ id: studentId });
    if (!student) {
      throw new AppError('Student not found', 404, 'STUDENT_NOT_FOUND');
    }

    Object.assign(student, updateData);
    await student.save();

    return student;
  }

  /**
   * Delete student
   * @param {string} studentId - Student ID
   * @returns {Promise<void>}
   */
  async deleteStudent(studentId) {
    const student = await Student.findOne({ id: studentId });
    if (!student) {
      throw new AppError('Student not found', 404, 'STUDENT_NOT_FOUND');
    }

    await Student.findByIdAndDelete(student._id);
  }

  /**
   * Determine student level from ID pattern
   * @param {string} id - Student ID
   * @returns {number} Student level
   */
  determineLevelFromId(id) {
    // This is a simple implementation - adjust based on your ID pattern
    const year = new Date().getFullYear();
    const idYear = parseInt(id.substring(0, 4));
    return Math.max(1, Math.min(4, year - idYear + 1));
  }
}

module.exports = new StudentService();
