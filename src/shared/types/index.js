"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTIFICATION_TYPES = exports.PROCESSING_STAGES = exports.CALCULATION_TYPES = exports.REBATE_LEVELS = void 0;
// Constants
exports.REBATE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8];
exports.CALCULATION_TYPES = ['visa_mco', 'partnerpay', 'voyage_prive', 'region_country'];
exports.PROCESSING_STAGES = ['validation', 'loading', 'calculation', 'complete'];
exports.NOTIFICATION_TYPES = ['success', 'error', 'warning', 'info'];
// Database types will be imported directly where needed
// to avoid circular dependencies during compilation
