import NextAuth from 'next-auth/next'
import { authOptions } from '@/lib/auth'

/**
 * @swagger
 * /api/auth/signin:
 *   get:
 *     summary: Get sign-in page
 *     description: Returns the NextAuth sign-in page
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Sign-in page returned successfully
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *   post:
 *     summary: Sign in user
 *     description: Authenticates a user with credentials
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email
 *                 example: "admin@example.com"
 *               password:
 *                 type: string
 *                 description: User password
 *                 example: "password123"
 *               csrfToken:
 *                 type: string
 *                 description: CSRF token
 *     responses:
 *       200:
 *         description: Authentication successful
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * 
 * /api/auth/signout:
 *   get:
 *     summary: Get sign-out page
 *     description: Returns the NextAuth sign-out page
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Sign-out page returned successfully
 *   post:
 *     summary: Sign out user
 *     description: Signs out the current user
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               csrfToken:
 *                 type: string
 *                 description: CSRF token
 *     responses:
 *       200:
 *         description: Sign-out successful
 * 
 * /api/auth/session:
 *   get:
 *     summary: Get current session
 *     description: Returns the current user session
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Session information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 expires:
 *                   type: string
 *                   format: date-time
 *                   description: Session expiration time
 *       401:
 *         description: No active session
 * 
 * /api/auth/csrf:
 *   get:
 *     summary: Get CSRF token
 *     description: Returns a CSRF token for form submissions
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: CSRF token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 csrfToken:
 *                   type: string
 *                   description: CSRF token
 */

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
