export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Won' | 'Lost';
export type LeadPriority = 'High' | 'Medium' | 'Low';

export type LeadRow = {
  leadId: string;
  customerName: string;
  company: string;
  phone: string;
  source: string;
  assignedTo: string;
  leadStatus: LeadStatus;
  priority: LeadPriority;
  nextFollowUp: string;
  createdDate: string;
};

export const leadRows: LeadRow[] = [
  { leadId: 'L-2001', customerName: 'Aarav Sharma', company: 'BluePeak Retail', phone: '+91 98765 12340', source: 'Website', assignedTo: 'Ananya Verma', leadStatus: 'New', priority: 'High', nextFollowUp: 'Today, 03:00 PM', createdDate: '21 Jul 2026' },
  { leadId: 'L-2002', customerName: 'Meera Patel', company: 'Northstar Finance', phone: '+91 98765 12341', source: 'Referral', assignedTo: 'Rohan Mehta', leadStatus: 'Contacted', priority: 'Medium', nextFollowUp: 'Tomorrow, 11:30 AM', createdDate: '20 Jul 2026' },
  { leadId: 'L-2003', customerName: 'Kabir Singh', company: 'Urban Edge Solutions', phone: '+91 98765 12342', source: 'LinkedIn', assignedTo: 'Pooja Nair', leadStatus: 'Qualified', priority: 'High', nextFollowUp: 'Today, 05:15 PM', createdDate: '20 Jul 2026' },
  { leadId: 'L-2004', customerName: 'Ananya Verma', company: 'BrightPath Logistics', phone: '+91 98765 12343', source: 'Outbound', assignedTo: 'Siddharth Rao', leadStatus: 'Proposal', priority: 'High', nextFollowUp: '25 Jul 2026', createdDate: '19 Jul 2026' },
  { leadId: 'L-2005', customerName: 'Rohan Mehta', company: 'Metro Health Labs', phone: '+91 98765 12344', source: 'Website', assignedTo: 'Neha Singh', leadStatus: 'Won', priority: 'Low', nextFollowUp: 'N/A', createdDate: '18 Jul 2026' },
  { leadId: 'L-2006', customerName: 'Isha Gupta', company: 'Cloudnine Systems', phone: '+91 98765 12345', source: 'Email Campaign', assignedTo: 'Tarun Bose', leadStatus: 'Lost', priority: 'Low', nextFollowUp: 'N/A', createdDate: '17 Jul 2026' },
  { leadId: 'L-2007', customerName: 'Nikhil Jain', company: 'PrimeCart Commerce', phone: '+91 98765 12346', source: 'Trade Show', assignedTo: 'Kavya Menon', leadStatus: 'Contacted', priority: 'Medium', nextFollowUp: 'Today, 04:20 PM', createdDate: '18 Jul 2026' },
  { leadId: 'L-2008', customerName: 'Pooja Nair', company: 'Apex Mobility', phone: '+91 98765 12347', source: 'Website', assignedTo: 'Arjun Malhotra', leadStatus: 'New', priority: 'High', nextFollowUp: 'Today, 06:10 PM', createdDate: '21 Jul 2026' },
  { leadId: 'L-2009', customerName: 'Siddharth Rao', company: 'Vertex Industries', phone: '+91 98765 12348', source: 'Partner', assignedTo: 'Ananya Verma', leadStatus: 'Qualified', priority: 'Medium', nextFollowUp: 'Tomorrow, 02:00 PM', createdDate: '19 Jul 2026' },
  { leadId: 'L-2010', customerName: 'Neha Singh', company: 'Nova Retail Group', phone: '+91 98765 12349', source: 'Referral', assignedTo: 'Meera Patel', leadStatus: 'Proposal', priority: 'High', nextFollowUp: '24 Jul 2026', createdDate: '19 Jul 2026' },
  { leadId: 'L-2011', customerName: 'Tarun Bose', company: 'Zenith Foods', phone: '+91 98765 12350', source: 'Outbound', assignedTo: 'Rohan Mehta', leadStatus: 'Contacted', priority: 'Low', nextFollowUp: 'Today, 01:30 PM', createdDate: '20 Jul 2026' },
  { leadId: 'L-2012', customerName: 'Kavya Menon', company: 'Summit Education', phone: '+91 98765 12351', source: 'Website', assignedTo: 'Pooja Nair', leadStatus: 'New', priority: 'Medium', nextFollowUp: 'Tomorrow, 10:00 AM', createdDate: '21 Jul 2026' },
  { leadId: 'L-2013', customerName: 'Arjun Malhotra', company: 'Orbit Telecom', phone: '+91 98765 12352', source: 'LinkedIn', assignedTo: 'Siddharth Rao', leadStatus: 'Qualified', priority: 'High', nextFollowUp: '22 Jul 2026', createdDate: '17 Jul 2026' },
  { leadId: 'L-2014', customerName: 'Sana Khan', company: 'Pulse Healthcare', phone: '+91 98765 12353', source: 'Email Campaign', assignedTo: 'Neha Singh', leadStatus: 'Lost', priority: 'Low', nextFollowUp: 'N/A', createdDate: '16 Jul 2026' },
  { leadId: 'L-2015', customerName: 'Vikram Joshi', company: 'Fusion Energy', phone: '+91 98765 12354', source: 'Referral', assignedTo: 'Tarun Bose', leadStatus: 'Won', priority: 'Medium', nextFollowUp: 'N/A', createdDate: '15 Jul 2026' },
  { leadId: 'L-2016', customerName: 'Ritika Kapoor', company: 'Horizon Foods', phone: '+91 98765 12355', source: 'Trade Show', assignedTo: 'Kavya Menon', leadStatus: 'Proposal', priority: 'High', nextFollowUp: '25 Jul 2026', createdDate: '19 Jul 2026' },
  { leadId: 'L-2017', customerName: 'Manish Yadav', company: 'Astra Media', phone: '+91 98765 12356', source: 'Website', assignedTo: 'Arjun Malhotra', leadStatus: 'Contacted', priority: 'Medium', nextFollowUp: 'Today, 07:00 PM', createdDate: '20 Jul 2026' },
  { leadId: 'L-2018', customerName: 'Priya Desai', company: 'Greenfield Agro', phone: '+91 98765 12357', source: 'Partner', assignedTo: 'Pooja Nair', leadStatus: 'New', priority: 'High', nextFollowUp: 'Today, 02:30 PM', createdDate: '21 Jul 2026' },
];

