"use strict";
const { Organization } = require("../models");

const getOrganization = async (req, res) => {
    try {
        const user = req.user;
        const organization = await Organization.findOne({ where: { userId: user.id } });

        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        res.json(organization);
    }
    catch (error) {
        console.error('Get Organization Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateOrganization = async (req, res) => {
    try {
        const user = req.user;
        const { name, mestaOrgId } = req.body;

        const [updatedRows, [updatedOrg]] = await Organization.update(
            { name, mestaOrgId },
            {
                where: { userId: user.id },
                returning: true
            }
        );

        res.json(updatedOrg);
    }
    catch (error) {
        console.error('Update Organization Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const submitKyc = async (req, res) => {
    try {
        const user = req.user;
        const { documentType, documentNumber } = req.body;
        const kycData = JSON.stringify({ documentType, documentNumber, submittedAt: new Date() });

        const [updatedRows, [organization]] = await Organization.update(
            {
                kycStatus: 'VERIFIED', // Auto-verify for sandbox/demo purposes
                kycData: kycData
            },
            {
                where: { userId: user.id },
                returning: true
            }
        );

        res.json({ message: 'KYC Submitted and Verified', organization });
    }
    catch (error) {
        console.error('KYC Submit Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getOrganization,
    updateOrganization,
    submitKyc
};
