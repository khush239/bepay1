"use strict";
const { User, Organization, Payout } = require("../models");
const sequelize = require("../config/database");

// Add Banking Details
const updateBankingDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const { accountNumber, bankName } = req.body;
        if (!accountNumber || !bankName) {
            return res.status(400).json({ message: 'Account Number and Bank Name are required' });
        }
        // Check if account number is unique (except for current user)
        const existing = await User.findOne({ where: { accountNumber } });
        if (existing && existing.id !== userId) {
            return res.status(400).json({ message: 'Account Number already in use' });
        }

        const [updatedRows, [updatedUser]] = await User.update(
            { accountNumber, bankName },
            {
                where: { id: userId },
                returning: true
            }
        );
        res.json(updatedUser);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating banking details', error });
    }
};

// Internal Transfer
const internalTransfer = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const senderId = req.user.id;
        const { receiverAccountNumber, amount, description } = req.body;
        const numAmount = parseFloat(amount);

        if (!receiverAccountNumber || !numAmount || numAmount <= 0) {
            await t.rollback();
            return res.status(400).json({ message: 'Invalid payload' });
        }

        // 1. Check Sender KYC
        const senderOrg = await Organization.findOne({ where: { userId: senderId } });

        if (senderOrg?.kycStatus !== 'VERIFIED') {
            await t.rollback();
            return res.status(403).json({ message: 'KYC not verified. Cannot initiate transfer.' });
        }

        // 2. Find Receiver
        const receiver = await User.findOne({ where: { accountNumber: receiverAccountNumber } });
        if (!receiver) {
            await t.rollback();
            return res.status(404).json({ message: 'Receiver account not found' });
        }
        if (receiver.id === senderId) {
            await t.rollback();
            return res.status(400).json({ message: 'Cannot transfer to self' });
        }

        // 3. Create Transaction
        // Check sender balance
        if (!senderOrg || parseFloat(senderOrg.balance) < numAmount) {
            throw new Error('Insufficient funds');
        }

        // Deduct from sender
        await senderOrg.decrement('balance', { by: numAmount, transaction: t });

        // Add to receiver's organization
        const receiverOrg = await Organization.findOne({ where: { userId: receiver.id } });
        if (receiverOrg) {
            await receiverOrg.increment('balance', { by: numAmount, transaction: t });
        }

        // Create Payout record
        const transfer = await Payout.create({
            amount: numAmount,
            currency: 'USD',
            type: 'INTERNAL',
            status: 'COMPLETED', // Instant transfer
            description: description || 'Internal Transfer',
            senderId: senderId,
            receiverId: receiver.id,
        }, { transaction: t });

        await t.commit();
        res.json({ message: 'Transfer successful', transfer });
    }
    catch (error) {
        await t.rollback();
        console.error(error);
        res.status(500).json({ message: 'Internal transfer failed', error: error.message });
    }
};

// Deposit Funds
const deposit = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const userId = req.user.id;
        const { amount } = req.body;
        const numAmount = parseFloat(amount);

        if (!numAmount || numAmount <= 0) {
            await t.rollback();
            return res.status(400).json({ message: 'Invalid amount' });
        }

        // Update Balance
        const organization = await Organization.findOne({ where: { userId } });
        if (!organization) {
            await t.rollback();
            return res.status(404).json({ message: 'Organization not found' });
        }

        await organization.increment('balance', { by: numAmount, transaction: t });

        // Reload to get updated balance
        await organization.reload({ transaction: t });

        // Record Transaction
        await Payout.create({
            amount: numAmount,
            currency: 'USD',
            type: 'INTERNAL',
            status: 'COMPLETED',
            description: 'Wallet Deposit',
            receiverId: userId, // Money IN
        }, { transaction: t });

        await t.commit();
        res.json({ message: 'Deposit successful', balance: organization.balance });
    }
    catch (error) {
        await t.rollback();
        console.error('Deposit error', error);
        res.status(500).json({ message: 'Deposit failed', error });
    }
};

module.exports = {
    updateBankingDetails,
    internalTransfer,
    deposit
};
