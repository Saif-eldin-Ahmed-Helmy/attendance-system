/**
 * @swagger
 * /api/users/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login user with email and password
 *     description: Authenticate user and create session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *
 * /api/users/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register new user account
 *     description: Create new user account with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               name:
 *                 type: string
 *                 minLength: 2
 *               gender:
 *                 type: string
 *                 enum: [male, female, not_specified]
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Registration successful
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *
 * /api/students/list:
 *   get:
 *     tags: [Students]
 *     summary: Get paginated list of students
 *     description: Retrieve students with optional filtering and pagination
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *       - name: level
 *         in: query
 *         description: Filter by student level
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 4
 *     responses:
 *       200:
 *         description: Students retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         items:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Student'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *
 * /api/students/upload:
 *   post:
 *     tags: [Students]
 *     summary: Upload students from file
 *     description: Bulk upload students from text/CSV file
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - subject
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File containing student data
 *               subject:
 *                 type: string
 *                 description: Subject ID to enroll students
 *               group:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 2
 *               section:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 4
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Success'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *
 * /api/camera/attendance:
 *   post:
 *     tags: [Hardware]
 *     summary: Process attendance from hardware device
 *     description: Submit attendance data from OCR, RFID, or keypad
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - location
 *             properties:
 *               id:
 *                 type: string
 *                 description: Student ID
 *                 example: "20210001"
 *               location:
 *                 type: string
 *                 description: Location string (ROOM|number or LAB|number)
 *                 example: "ROOM|101"
 *     responses:
 *       200:
 *         description: Attendance recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         student:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                         subject:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                             code:
 *                               type: string
 *                         sessionType:
 *                           type: string
 *                           enum: [lecture, section]
 *                         week:
 *                           type: integer
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 */

