"use strict";
const { Op } = require("sequelize");
const apiService = require("../services/mestaService");
const { Organization, Beneficiary, Payout, User } = require("../models");
const sequelize = require("../config/database");

// Get all beneficiaries for the logged-in user's organization
const getBeneficiaries = async (req, res) => {
    try {
        const user = req.user;
        const organization = await Organization.findOne({ where: { userId: user.id } });
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }
        const beneficiaries = await Beneficiary.findAll({
            where: { organizationId: organization.id },
            order: [['createdAt', 'DESC']]
        });

        res.json(beneficiaries);
    }
    catch (error) {
        console.error('Get Beneficiaries Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create a new beneficiary
const createBeneficiary = async (req, res) => {
    try {
        const user = req.user;
        const { name, email, currency, accountDetails } = req.body;
        const organization = await Organization.findOne({ where: { userId: user.id } });
        if (!organization)
            return res.status(404).json({ message: 'Organization not found' });

        // 1. Create in Mesta (or mock)
        const mestaBen = await apiService.createMestaBeneficiary({ name, email, currency, accountDetails });

        // 2. Save to DB
        const beneficiary = await Beneficiary.create({
            organizationId: organization.id,
            name,
            email,
            currency,
            accountDetails: JSON.stringify(accountDetails), // stored as string
            mestaBeneficiaryId: mestaBen.id,
        });

        res.status(201).json(beneficiary);
    }
    catch (error) {
        console.error('Create Beneficiary Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update a beneficiary
const updateBeneficiary = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { name } = req.body;

        const organization = await Organization.findOne({ where: { userId: user.id } });
        if (!organization)
            return res.status(404).json({ message: 'Organization not found' });

        // Verify beneficiary belongs to org
        const beneficiary = await Beneficiary.findOne({ where: { id, organizationId: organization.id } });
        if (!beneficiary) {
            return res.status(404).json({ message: 'Beneficiary not found' });
        }

        // Update in DB
        beneficiary.name = name;
        await beneficiary.save();

        res.json(beneficiary);
    }
    catch (error) {
        console.error('Update Beneficiary Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all payouts
const getAllPayouts = async (req, res) => {
    try {
        const userId = req.user.id;
        const org = await Organization.findOne({ where: { userId } });

        const payouts = await Payout.findAll({
            where: {
                [Op.or]: [
                    { organizationId: org?.id },
                    { senderId: userId },
                    { receiverId: userId }
                ]
            },
            include: [
                { model: Beneficiary, as: 'beneficiary' },
                { model: User, as: 'sender', attributes: ['name', 'email'] },
                { model: User, as: 'receiver', attributes: ['name', 'email'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json(payouts);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching payouts', error: error.message });
    }
};

// Initiate Payout
const createPayout = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const user = req.user;
        const { beneficiaryId, amount, currency, description } = req.body;

        const organization = await Organization.findOne({ where: { userId: user.id } });
        if (!organization) {
            await t.rollback();
            return res.status(404).json({ message: 'Organization not found' });
        }

        const beneficiary = await Beneficiary.findByPk(beneficiaryId);
        if (!beneficiary) {
            await t.rollback();
            return res.status(404).json({ message: 'Beneficiary not found' });
        }

        // 1. Initiate in Mesta
        const mestaOrder = await apiService.createMestaPayout({
            beneficiaryId: beneficiary.mestaBeneficiaryId,
            amount,
            currency,
            description
        });

        // 2. Save to DB and Update Balance
        // Check balance (using helper conversion)
        if (parseFloat(organization.balance) < parseFloat(amount)) {
            throw new Error('Insufficient funds');
        }

        // Deduct Balance
        await organization.decrement('balance', { by: amount, transaction: t });

        const payout = await Payout.create({
            organizationId: organization.id,
            beneficiaryId: beneficiary.id,
            amount,
            currency,
            status: 'PENDING',
            mestaPayoutId: mestaOrder.id,
            description,
        }, { transaction: t });

        await t.commit();

        // DEMO ONLY: Automatically complete payout after 10 seconds
        setTimeout(async () => {
            try {
                await Payout.update({ status: 'COMPLETED' }, { where: { id: payout.id } });
                console.log(`[DEMO] Automatically completed payout ${payout.id}`);
            } catch (err) {
                console.error('[DEMO] Failed to auto-complete payout', err);
            }
        }, 10000);

        res.status(201).json(payout);
    }
    catch (error) {
        await t.rollback();
        console.error('Create Payout Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getReconciliation = async (req, res) => {
    try {
        const userId = req.user.id;
        const org = await Organization.findOne({ where: { userId } });

        const payouts = await Payout.findAll({
            where: {
                [Op.or]: [
                    { organizationId: org?.id },
                    { senderId: userId },
                    { receiverId: userId }
                ]
            },
            include: [
                { model: Beneficiary, as: 'beneficiary' },
                { model: User, as: 'sender', attributes: ['name'] },
                { model: User, as: 'receiver', attributes: ['name'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        const reconciliationData = payouts.map(p => {
            const isInternal = p.type === 'INTERNAL';
            const isIncoming = isInternal && p.receiverId === userId;

            return {
                id: p.id,
                date: p.createdAt,
                type: isIncoming ? 'CREDIT' : 'DEBIT',
                amount: p.amount,
                currency: p.currency,
                description: p.description,
                status: p.status,
                counterparty: isInternal
                    ? (isIncoming ? p.sender?.name : p.receiver?.name)
                    : p.beneficiary?.name,
                category: isInternal ? 'Internal Transfer' : 'External Payout'
            };
        });

        res.json(reconciliationData);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching reconciliation data', error });
    }
};

const exportReconciliation = async (req, res) => {
    // Similar to getReconciliation but returns CSV
    // (Simplified for brevity, reusing logic)
    // ... logic remains almost identical except for formatting
    try {
        const userId = req.user.id;
        const org = await Organization.findOne({ where: { userId } });
        const payouts = await Payout.findAll({
            where: {
                [Op.or]: [
                    { organizationId: org?.id },
                    { senderId: userId },
                    { receiverId: userId }
                ]
            },
            include: [
                { model: Beneficiary, as: 'beneficiary' },
                { model: User, as: 'sender', attributes: ['name'] },
                { model: User, as: 'receiver', attributes: ['name'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        // ... CSV generation logic (same as before) ...
        const headers = ['Transaction ID', 'Date', 'Type', 'Amount', 'Currency', 'Status', 'Description', 'Counterparty', 'Category'];
        const rows = payouts.map(p => {
            const isInternal = p.type === 'INTERNAL';
            const isIncoming = isInternal && p.receiverId === userId;
            const counterparty = isInternal
                ? (isIncoming ? p.sender?.name : p.receiver?.name)
                : p.beneficiary?.name;

            return [
                p.id,
                p.createdAt.toISOString(),
                isIncoming ? 'CREDIT' : 'DEBIT',
                p.amount,
                p.currency,
                p.status,
                `"${p.description || ''}"`,
                `"${counterparty || 'Unknown'}"`,
                isInternal ? 'Internal Transfer' : 'External Payout'
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        res.header('Content-Type', 'text/csv');
        res.attachment('reconciliation.csv');
        res.send(csvContent);
    } catch (error) {
        res.status(500).json({ message: 'Error exporting CSV' });
    }
};

module.exports = {
    getBeneficiaries,
    createBeneficiary,
    updateBeneficiary,
    getAllPayouts,
    createPayout,
    getReconciliation,
    exportReconciliation
};
