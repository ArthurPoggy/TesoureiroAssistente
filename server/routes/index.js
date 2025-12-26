const express = require('express');
const authRoutes = require('./auth');
const membersRoutes = require('./members');
const paymentsRoutes = require('./payments');
const goalsRoutes = require('./goals');
const expensesRoutes = require('./expenses');
const eventsRoutes = require('./events');
const filesRoutes = require('./files');
const reportsRoutes = require('./reports');
const dashboardRoutes = require('./dashboard');
const seedRoutes = require('./seed');

const router = express.Router();

// Auth routes
router.use('/', authRoutes);

// Resource routes
router.use('/members', membersRoutes);
router.use('/payments', paymentsRoutes);
router.use('/goals', goalsRoutes);
router.use('/expenses', expensesRoutes);
router.use('/events', eventsRoutes);
router.use('/files', filesRoutes);
router.use('/reports', reportsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/ranking', dashboardRoutes);
router.use('/seed', seedRoutes);

module.exports = router;
