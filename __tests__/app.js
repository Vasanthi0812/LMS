// __tests__/app.test.js
const { sequelize } = require('../models');
const request = require('supertest');
const app = require('../app'); // Adjust the path based on your project structure
const { User, Course } = require('../models');
const bcrypt = require('bcryptjs');

// Constants for test data
const testUserData = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: 'password123',
    role: 'student',
};

const testCourseData = {
    courseName: 'Test Course',
    courseDescription: 'Test Course Description',
};

describe('Test LMS Application', () => {
    let courseId; // Variable to store the course ID

    beforeAll(async () => {
        await sequelize.sync({ force: true });
        // Setup: Create a test user, educator, and course for testing
        const hashedPwd = await bcrypt.hash(testUserData.password, 10);

        await User.create({
            ...testUserData,
            password: hashedPwd,
        });

        // Create a test course and store its ID
        const courseResponse = await request(app)
            .post('/course')
            .send(testCourseData);

        courseId = courseResponse.body.id;

        await Course.create({
            ...testCourseData,
            educatorId: 1, // Assuming the test educator has id 1
        });
    });

    afterAll(async () => {
        // Teardown: Cleanup the database after testing
        await User.destroy({ where: {} });
        await Course.destroy({ where: {} });
    });

    describe('Signup and Login', () => {
        test('should allow a user to sign up', async () => {
            const response = await request(app)
                .post('/user')
                .send(testUserData);

            expect(response.statusCode).toBe(302); // Redirect after successful signup
        });

        test('should allow a user to log in', async () => {
            const agent = request.agent(app);

            const loginResponse = await agent.post('/session').send({
                email: testUserData.email,
                password: testUserData.password,
            });

            expect(loginResponse.statusCode).toBe(302); // Redirect after successful login
        });
    });

    describe('Password Change', () => {
        test('should allow a user to change password', async () => {
            const agent = request.agent(app);

            // Log in as an existing user
            await agent.post('/session').send({
                email: testUserData.email,
                password: testUserData.password,
            });

            const response = await agent
                .post('/password')
                .send({
                    newPassword: 'newpassword123',
                    confirmPassword: 'newpassword123',
                });

            expect(response.statusCode).toBe(302);

            // Log in with the new password
            const loginResponse = await agent.post('/session').send({
                email: testUserData.email,
                password: 'newpassword123',
            });

            expect(loginResponse.statusCode).toBe(302);
        });
    });

    describe('Educator Features Test Suite', () => {
        test('should allow an educator to create a course', async () => {
            const response = await request(app)
                .post('/course')
                .send(testCourseData);

            expect(response.statusCode).toBe(302); // Redirect after successful login
        });

        test('should allow an educator to create a chapter', async () => {
            const response = await request(app)
                .post('/chapter')
                .send({
                    chapterName: 'Test Chapter',
                });

            expect(response.statusCode).toBe(302); // Redirect after successful login
        });

        test('should allow an educator to create a page', async () => {
            const response = await request(app)
                .post('/page')
                .send({
                    pageName: 'Test Page',
                });

            expect(response.statusCode).toBe(302); // Redirect after successful login
        });
    });

    describe('Student Features Test Suite', () => {
        test('should allow a student to sign up', async () => {
            const response = await request(app)
                .post('/user')
                .send(testUserData);

            expect(response.statusCode).toBe(302); // Redirect after successful signup
        });

        test('should allow a student to enroll in a course', async () => {
            const response = await request(app)
                .post(`/enrollCourse/${courseId}`); // Use the stored course ID

            expect(response.statusCode).toBe(302); // Redirect after successful enrollment
        });

        test('should allow a student to mark a page as completed', async () => {
            // Replace 1 with a valid page ID
            const pageId = 1;
            const response = await request(app)
                .post(`/completePage/${pageId}`);

            expect(response.statusCode).toBe(302);
        });

        test('user can sign out of the application', async () => {
            const response = await request(app)
                .get('/signout');

            expect(response.statusCode).toBe(302);
        });
    });
});
