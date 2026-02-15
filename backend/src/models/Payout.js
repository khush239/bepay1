const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payout = sequelize.define('Payout', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        get() {
            const value = this.getDataValue('amount');
            return value === null ? null : parseFloat(value);
        }
    },
    currency: { type: DataTypes.STRING, allowNull: false },
    status: {
        type: DataTypes.ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'),
        defaultValue: 'PENDING'
    },
    description: { type: DataTypes.STRING },
    type: {
        type: DataTypes.ENUM('EXTERNAL', 'INTERNAL'),
        defaultValue: 'EXTERNAL'
    },

    // Foreign Keys
    organizationId: { type: DataTypes.UUID },
    beneficiaryId: { type: DataTypes.UUID },
    senderId: { type: DataTypes.UUID },
    receiverId: { type: DataTypes.UUID },

    mestaPayoutId: { type: DataTypes.STRING },
}, { timestamps: true });

module.exports = Payout;
