// Shared enums / option lists. Kept in sync with the server's permission and
// model definitions.

export const ROLES = [
  "Super Admin",
  "Group Admin",
  "Brand Admin",
  "HR Manager",
  "CRM Manager",
  "Finance",
  "Logistics Manager",
  "Dispatcher",
  "Hub Manager",
  "Customer Support",
  "Sales Staff",
  "Rider",
  "Staff",
];

export const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "NYSC",
  "Locum",
];

export const EMPLOYMENT_STATUSES = [
  "Active",
  "Probation",
  "Suspended",
  "On Leave",
  "Exited",
];

export const GENDERS = ["Male", "Female"];

export const LEAVE_STATUSES = [
  "Pending",
  "Manager Approved",
  "Approved",
  "Rejected",
  "Cancelled",
  "Clarification Requested",
];

export const ATTENDANCE_STATUSES = ["Present", "Late", "Absent", "On Leave", "Not Clocked In"];

// The 36 states + FCT.
export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa",
  "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger",
  "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe",
  "Zamfara", "FCT - Abuja",
];

export const PAGE_SIZE = 20;
