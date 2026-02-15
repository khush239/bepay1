const User = require('./User');
const Organization = require('./Organization');
const Beneficiary = require('./Beneficiary');
const Payout = require('./Payout');

// User <-> Organization
User.hasOne(Organization, { foreignKey: 'userId', as: 'organization' });
Organization.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Organization <-> Beneficiary
Organization.hasMany(Beneficiary, { foreignKey: 'organizationId', as: 'beneficiaries' });
Beneficiary.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

// Organization <-> Payout
Organization.hasMany(Payout, { foreignKey: 'organizationId', as: 'payouts' });
Payout.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

// Beneficiary <-> Payout
Beneficiary.hasMany(Payout, { foreignKey: 'beneficiaryId', as: 'payouts' });
Payout.belongsTo(Beneficiary, { foreignKey: 'beneficiaryId', as: 'beneficiary' });

// User <-> Payout (Internal Transfers)
User.hasMany(Payout, { foreignKey: 'senderId', as: 'sentTransfers' });
User.hasMany(Payout, { foreignKey: 'receiverId', as: 'receivedTransfers' });
Payout.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Payout.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

module.exports = {
    User,
    Organization,
    Beneficiary,
    Payout
};
