const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Beneficiary = sequelize.define('Beneficiary', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    organizationId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING },
    currency: { type: DataTypes.STRING, allowNull: false },
    accountDetails: { type: DataTypes.TEXT, allowNull: false }, // Store JSON string
    mestaBeneficiaryId: { type: DataTypes.STRING },
}, { timestamps: true });

module.exports = Beneficiary;
