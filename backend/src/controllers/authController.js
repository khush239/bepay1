"use strict";
const bcrypt = require("bcryptjs");
const { generateToken } = require("../utils/jwt");
const { User, Organization } = require("../models");
const sequelize = require("../config/database");

const register = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { email, password, name, organizationName } = req.body;
        // Check if user exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            await t.rollback();
            return res.status(400).json({ message: 'User already exists' });
        }
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await User.create({
            email,
            password: hashedPassword,
            name,
            role: 'USER',
        }, { transaction: t });

        // Create organization
        const organization = await Organization.create({
            name: organizationName || `${name}'s Organization`,
            userId: user.id,
            kycStatus: 'PENDING',
        }, { transaction: t });

        await t.commit();

        const token = generateToken(user.id);
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                organizationId: organization.id,
            },
        });
    }
    catch (error) {
        await t.rollback();
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const organization = await Organization.findOne({ where: { userId: user.id } });

        const token = generateToken(user.id);
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                organizationId: organization?.id,
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getMe = async (req, res) => {
    try {
        const user = req.user; // Set by authMiddleware
        const organization = await Organization.findOne({ where: { userId: user.id } });
        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                organizationId: organization?.id,
                accountNumber: user.accountNumber,
                bankName: user.bankName,
                balance: organization?.balance || 0,
            },
        });
    }
    catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    register,
    login,
    getMe
};
