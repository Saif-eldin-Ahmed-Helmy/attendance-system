const Attendance = require('../../models/Attendance');
const Student = require('../../models/Student');
const Subject = require('../../models/Subject');
const AppError = require('../utils/AppError');

/**
 * Attendance Service
 * Contains all business logic related to attendance operations
 */
class AttendanceService {
  /**
   * Process attendance submission from hardware device
   * @param {string} studentId - Student ID
   * @param {string} location - Location string (e.g., "ROOM|101" or "LAB|201")
   * @returns {Promise<Object>} Attendance processing result
   */
  async processAttendance(studentId, location) {
    const [type, number] = location.split('|');

    if (!type || !number || !['ROOM', 'LAB'].includes(type)) {
      throw new AppError('Invalid location format', 400, 'INVALID_LOCATION');
    }

    // Find student
    const student = await Student.findOne({ id: studentId });
    if (!student) {
      throw new AppError('Student not found', 404, 'STUDENT_NOT_FOUND');
    }

    // Determine active subject and schedule
    const { activeSubject, activeSchedule } = await this.findActiveSubjectAndSchedule(type, number);

    if (!activeSubject || !activeSchedule) {
      const sessionType = type === 'ROOM' ? 'lecture' : 'section';
      throw new AppError(`No active ${sessionType} found`, 400, 'NO_ACTIVE_SESSION');
    }

    // Verify student enrollment
    const studentSubject = student.subjects.find(
      s => s.subject.toString() === activeSubject._id.toString()
    );

    if (!studentSubject) {
      throw new AppError('Student not enrolled in this subject', 400, 'NOT_ENROLLED');
    }

    const enrolledNumber = type === 'ROOM' ? studentSubject.group : studentSubject.section;
    const activeNumber = type === 'ROOM' ? activeSchedule.groupNumber : activeSchedule.sectionNumber;
    if (enrolledNumber !== activeNumber) throw new AppError('Student is not enrolled in this session', 403, 'WRONG_SESSION');

    // Calculate current week
    const currentWeek = this.calculateCurrentWeek(activeSubject.startWeek);

    // Process attendance record
    const attendanceResult = await this.createOrUpdateAttendance({
      student: student._id,
      subject: activeSubject._id,
      week: currentWeek,
      group: studentSubject.group,
      section: studentSubject.section,
      isLecture: type === 'ROOM',
      activeSchedule
    });

    return {
      success: true,
      student: {
        id: student.id,
        name: student.name
      },
      subject: {
        name: activeSubject.name,
        code: activeSubject.code
      },
      week: currentWeek,
      sessionType: type === 'ROOM' ? 'lecture' : 'section',
      timestamp: new Date(),
      ...attendanceResult
    };
  }

  /**
   * Find active subject and schedule based on location and time
   * @param {string} type - Location type (ROOM/LAB)
   * @param {string} number - Room/Lab number
   * @returns {Promise<Object>} Active subject and schedule
   */
  async findActiveSubjectAndSchedule(type, number) {
    const now = new Date();
    const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    const currentTime = now.getHours() + now.getMinutes() / 60;

    // Find subjects with matching location and time
    const locationField = type === 'ROOM' ? 'groups' : 'sections';
    const locationNumberField = type === 'ROOM' ? 'roomNumber' : 'labNumber';

    const subjects = await Subject.find({
      [`${locationField}.schedule.${locationNumberField}`]: parseInt(number)
    }).populate('doctor teachingAssistant');

    for (const subject of subjects) {
      const schedules = subject[locationField];

      for (const schedule of schedules) {
        if (schedule.schedule?.[locationNumberField] === Number(number) && this.isScheduleActive(schedule.schedule, currentDay, currentTime)) {
          return { activeSubject: subject, activeSchedule: schedule };
        }
      }
    }

    return { activeSubject: null, activeSchedule: null };
  }

  /**
   * Check if a schedule is currently active
   * @param {Object} schedule - Schedule object
   * @param {string} currentDay - Current day of week
   * @param {number} currentTime - Current time in hours
   * @returns {boolean} Whether schedule is active
   */
  isScheduleActive(schedule, currentDay, currentTime) {
    if (!schedule || schedule.day !== currentDay) return false;

    const startTime = this.parseTime(schedule.startTime);
    const endTime = this.parseTime(schedule.endTime);

    return currentTime >= startTime && currentTime <= endTime;
  }

  /**
   * Create or update attendance record
   * @param {Object} attendanceData - Attendance data
   * @returns {Promise<Object>} Attendance result
   */
  async createOrUpdateAttendance(attendanceData) {
    const { student, subject, week, group, section, isLecture } = attendanceData;

    const identity = { student, subject, week, group: group ?? null, section: section ?? null };
    const timeField = isLecture ? 'lectureAttendanceTime' : 'sectionAttendanceTime';
    try {
      const result = await Attendance.findOneAndUpdate(
        { ...identity, [timeField]: null },
        { $setOnInsert: identity, $set: { [timeField]: new Date() } },
        { upsert: true, new: true, includeResultMetadata: true, runValidators: true }
      );
      const created = !!result.lastErrorObject?.upserted;
      return { action: created ? 'created' : 'updated', previousRecord: !created };
    } catch (error) {
      if (error.code === 11000) {
        const updated = await Attendance.findOneAndUpdate(
          { ...identity, [timeField]: null }, { $set: { [timeField]: new Date() } }, { new: true }
        );
        if (updated) return { action: 'updated', previousRecord: true };
        throw new AppError('Attendance already recorded', 400, 'ALREADY_RECORDED');
      }
      throw error;
    }
  }

  /**
   * Get attendance statistics for a subject
   * @param {string} subjectId - Subject ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Attendance statistics
   */
  async getSubjectAttendanceStats(subjectId, filters = {}) {
    const { week, group, section } = filters;

    const query = { subject: subjectId };
    if (week) query.week = week;
    if (group) query.group = group;
    if (section) query.section = section;

    const attendanceRecords = await Attendance.find(query)
      .populate('student', 'name id')
      .sort({ week: 1 });

    const stats = this.calculateAttendanceStatistics(attendanceRecords);

    return {
      subject: subjectId,
      totalRecords: attendanceRecords.length,
      statistics: stats,
      records: attendanceRecords
    };
  }

  /**
   * Calculate attendance statistics
   * @param {Array} records - Attendance records
   * @returns {Object} Calculated statistics
   */
  calculateAttendanceStatistics(records) {
    const stats = {
      totalStudents: new Set(),
      lectureAttendance: 0,
      sectionAttendance: 0,
      weeklyStats: {}
    };

    records.forEach(record => {
      stats.totalStudents.add(record.student._id.toString());

      if (record.lectureAttendanceTime) stats.lectureAttendance++;
      if (record.sectionAttendanceTime) stats.sectionAttendance++;

      if (!stats.weeklyStats[record.week]) {
        stats.weeklyStats[record.week] = { lecture: 0, section: 0 };
      }

      if (record.lectureAttendanceTime) stats.weeklyStats[record.week].lecture++;
      if (record.sectionAttendanceTime) stats.weeklyStats[record.week].section++;
    });

    stats.totalStudents = stats.totalStudents.size;

    return stats;
  }

  /**
   * Calculate current week based on subject start date
   * @param {Date} startWeek - Subject start date
   * @returns {number} Current week number
   */
  calculateCurrentWeek(startWeek) {
    const now = new Date();
    const startDate = new Date(startWeek);
    const diffInMs = now - startDate;
    const diffInWeeks = Math.floor(diffInMs / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, diffInWeeks + 1);
  }

  /**
   * Parse time string to decimal hours
   * @param {string} timeString - Time in format "HH:MM"
   * @returns {number} Time in decimal hours
   */
  parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours + (minutes / 60);
  }
}

module.exports = new AttendanceService();
