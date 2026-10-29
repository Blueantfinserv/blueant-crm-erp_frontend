export const LEAD_FILTER_OPTIONS = ['All Prospects', 'Removed Prospects'] as const;
export const SERVICE_REQUEST_FORM_URL = 'https://docs.google.com/forms/d/14H3qkLVigG18GVMhcIqGb0PrR2hk3C5L9EHHDKxbqD0/viewform?edit_requested=true';
export const SHOW_NEW_LEAD_ACTION = false;
export const FUTURE_DAY_OPTIONS = ['Tomorrow', 'Day After Tomorrow', 'In 3 Days'] as const;
export type FutureDayFilter = typeof FUTURE_DAY_OPTIONS[number];
