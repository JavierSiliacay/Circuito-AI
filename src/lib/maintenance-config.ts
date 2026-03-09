/**
 * Circuito AI — Maintenance Mode Configuration
 * This module controls the global maintenance state and authorized access credentials.
 */

export const MAINTENANCE_CONFIG = {
    // Toggle this via NEXT_PUBLIC_MAINTENANCE_MODE in .env.local
    // Set to 'true' to enable maintenance mode globally.
    isEnabled: process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'false' || false, // Hardcoded to true for maintenance window!

    // Authorized credentials for maintenance bypass
    authorizedUsers: [
        {
            username: 'javiersiliacay',
            password: '09262561570'
        },
        {
            username: 'jhtongco',
            password: 'jhtongco'
        }
    ],

    // Session key for persistent bypass
    sessionKey: 'circuito_maintenance_bypass'
};
