const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Organization = sequelize.define('Organization', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: { type: DataTypes.STRING, allowNull: false },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true
    },
    kycStatus: {
        type: DataTypes.ENUM('PENDING', 'VERIFIED', 'REJECTED'),
        defaultValue: 'PENDING'
    },
    kycData: { type: DataTypes.TEXT },
    apiKey: { type: DataTypes.STRING, unique: true },
    mestaOrgId: { type: DataTypes.STRING },
    balance: {
        type: DataTypes.DECIMAL(10, 2), // Better for money than FLOAT
        defaultValue: 0.00,
        get() {
            const value = this.getDataValue('balance');
            return value === null ? null : parseFloat(value);
        }
    },
}, { timestamps: true });

module.exports = Organization;
