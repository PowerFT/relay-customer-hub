// Mock data for the customer service hub prototype

const CHANNELS = {
  whatsapp: { id: 'whatsapp', name: 'WhatsApp',  color: '#25D366', Icon: window.ChWhatsApp },
  messenger:{ id: 'messenger',name: 'Messenger', color: '#0084FF', Icon: window.ChMessenger },
  instagram:{ id: 'instagram',name: 'Instagram', color: '#DD2A7B', Icon: window.ChInstagram, gradient: 'linear-gradient(135deg, #F58529, #DD2A7B 50%, #8134AF)' },
  tiktok:   { id: 'tiktok',   name: 'TikTok',    color: '#000000', Icon: window.ChTikTok },
  linkedin: { id: 'linkedin', name: 'LinkedIn',  color: '#0A66C2', Icon: window.ChLinkedIn },
  webchat:  { id: 'webchat',  name: 'Webchat',   color: '#068B78', Icon: window.ChWebchat },
  email:    { id: 'email',    name: 'Email',     color: '#F97316', Icon: window.ChEmail },
  sms:      { id: 'sms',      name: 'SMS',       color: '#8862C8', Icon: window.ChSMS },
};

const CHANNEL_LIST = ['whatsapp','messenger','instagram','tiktok','linkedin','webchat','email','sms'];

const AGENTS = [
  { id: 'sara',   name: 'Sara Chen',      initials: 'SC', tone: '#F8C',  role: 'Senior Support' },
  { id: 'tom',    name: 'Tom Patel',      initials: 'TP', tone: '#9AD', role: 'Support Lead' },
  { id: 'maya',   name: 'Maya Williams',  initials: 'MW', tone: '#FCD', role: 'Support Agent' },
  { id: 'devon',  name: 'Devon Reyes',    initials: 'DR', tone: '#CDA', role: 'Support Agent' },
  { id: 'priya',  name: 'Priya Kapoor',   initials: 'PK', tone: '#FBA', role: 'Support Agent' },
  { id: 'me',     name: 'Alex Morgan',    initials: 'AM', tone: '#ACE', role: 'You' },
];

const CONTACT_TONES = ['#F8C7B0','#C7D2FE','#FBCFE8','#BBF7D0','#FED7AA','#DDD6FE','#FECDD3','#A7F3D0','#FDE68A','#BFDBFE'];

const CONVOS = [
  {
    id: 'c1', channel: 'whatsapp', contact: { name: 'Maria Lopez', handle: '+1 (415) 555-0123', tone: '#F8C7B0', online: true, verified: false },
    preview: "Hi! I haven't received my order #4521 — it's been 5 days. Can you help?",
    time: '2m', unread: 3, assignee: 'sara', status: 'open', priority: 'high', pinned: true,
    tags: ['VIP', 'Order issue'],
  },
  {
    id: 'c2', channel: 'instagram', contact: { name: 'Jordan Reeves', handle: '@jordanreeves', tone: '#FBCFE8', online: false, verified: true },
    preview: 'sent a photo · Is this the new model in matte black?',
    time: '8m', unread: 1, assignee: 'tom', status: 'open', priority: 'normal',
    tags: ['Pre-sales'],
  },
  {
    id: 'c3', channel: 'webchat', contact: { name: 'Chris Bauer', handle: 'chris@bauer.co', tone: '#BBF7D0', online: true, verified: false },
    preview: 'I tried the discount code WELCOME15 but it says invalid at checkout.',
    time: '12m', unread: 2, assignee: 'me', status: 'open', priority: 'normal',
    tags: ['Discount', 'Checkout'],
  },
  {
    id: 'c4', channel: 'messenger', contact: { name: 'Yuki Tanaka', handle: 'yuki.t', tone: '#C7D2FE', online: false, verified: false },
    preview: 'Thanks for the fast reply! All sorted now 🙏',
    time: '34m', unread: 0, assignee: 'maya', status: 'open', priority: 'low',
    tags: ['Resolved'],
  },
  {
    id: 'c5', channel: 'email', contact: { name: 'Hannah Reilly', handle: 'h.reilly@northbay.co', tone: '#FED7AA', online: false, verified: false },
    preview: 'Following up on invoice #INV-2024-0931 — please confirm the wire details.',
    time: '1h', unread: 0, assignee: 'devon', status: 'open', priority: 'normal',
    tags: ['Billing'],
  },
  {
    id: 'c6', channel: 'whatsapp', contact: { name: 'Diego Alvarez', handle: '+34 612 845 901', tone: '#FECDD3', online: false, verified: false },
    preview: 'Voice message · 0:42',
    time: '2h', unread: 1, assignee: null, status: 'open', priority: 'high',
    tags: ['Unassigned'],
  },
  {
    id: 'c7', channel: 'sms', contact: { name: 'Riley Park', handle: '+1 (212) 555-0188', tone: '#A7F3D0', online: false, verified: false },
    preview: 'Got the confirmation, see you Saturday!',
    time: '3h', unread: 0, assignee: 'priya', status: 'open', priority: 'low',
    tags: ['Appointment'],
  },
  {
    id: 'c8', channel: 'tiktok', contact: { name: 'Skye Nakamura', handle: '@skye.nk', tone: '#FDE68A', online: false, verified: true },
    preview: 'Comment on your latest post · "Where can I order this in EU?"',
    time: '5h', unread: 0, assignee: 'maya', status: 'open', priority: 'normal',
    tags: ['Comment'],
  },
  {
    id: 'c9', channel: 'linkedin', contact: { name: 'Marcus Hale', handle: 'in/marcushale', tone: '#BFDBFE', online: false, verified: false },
    preview: 'Hi — interested in your enterprise plan. Are you available for a 30-min call?',
    time: 'Yesterday', unread: 0, assignee: 'tom', status: 'open', priority: 'normal',
    tags: ['Sales lead'],
  },
  {
    id: 'c10', channel: 'instagram', contact: { name: 'Lola Greene', handle: '@lola.g', tone: '#FBCFE8', online: false, verified: false },
    preview: 'You: Glad I could help! Let me know if anything else comes up.',
    time: 'Yesterday', unread: 0, assignee: 'me', status: 'open', priority: 'low',
    tags: [],
  },
  {
    id: 'c11', channel: 'whatsapp', contact: { name: 'Owen Mitchell', handle: '+44 7700 900 451', tone: '#F8C7B0', online: false, verified: false },
    preview: 'Got it, no rush. Talk Monday.',
    time: '2d', unread: 0, assignee: 'sara', status: 'snoozed', priority: 'normal',
    tags: [],
  },
  {
    id: 'c12', channel: 'webchat', contact: { name: 'Aaliyah Brooks', handle: 'aaliyah@brooks.io', tone: '#BBF7D0', online: false, verified: false },
    preview: 'Thanks team, all clear on my end 🎉',
    time: '2d', unread: 0, assignee: 'devon', status: 'closed', priority: 'normal',
    tags: [],
  },
];

// Active conversation (c1 Maria Lopez)
const ACTIVE_THREAD = {
  contact: {
    name: 'Maria Lopez',
    phone: '+1 (415) 555-0123',
    email: 'maria.lopez@example.com',
    instagram: '@maria.lpz',
    tone: '#F8C7B0',
    verified: false,
    online: true,
    lastSeen: 'online now',
    location: 'San Francisco, CA',
    timezone: 'PST (UTC-8)',
    customerSince: 'Mar 2023',
    lifetimeValue: '$1,284',
    orders: 7,
    tags: [
      { label: 'VIP', tone: 'amber' },
      { label: 'Repeat customer', tone: 'green' },
      { label: 'Order issue', tone: 'blue' },
    ],
  },
  messages: [
    { type: 'date', label: 'Yesterday' },
    { type: 'in', author: 'Maria Lopez', time: '4:18 PM', text: "Hi! I placed an order last week (#4521) but it still says 'preparing for shipment'." },
    { type: 'in', author: 'Maria Lopez', time: '4:19 PM', text: "Tracking link isn't updating either. Can you check what's going on?" },
    { type: 'system', text: 'Sara assigned this conversation to you' },
    { type: 'out', author: 'Alex Morgan', via: 'WhatsApp', time: '4:32 PM', text: "Hi Maria! Thanks for reaching out — I'm pulling up your order now. One moment.", status: 'read' },
    { type: 'out', author: 'Alex Morgan', via: 'WhatsApp', time: '4:34 PM', text: "Confirmed — your order shipped from our SF warehouse yesterday at 6:12 PM. The carrier (UPS) hasn't scanned it in yet which is why tracking looks stale. Should update within 24h.", status: 'read' },
    { type: 'in', author: 'Maria Lopez', time: '4:36 PM', text: 'Oh good! Any way to confirm it actually left?' },
    { type: 'in', author: 'Maria Lopez', time: '4:36 PM', kind: 'image' },
    { type: 'in', author: 'Maria Lopez', time: '4:37 PM', text: "Here's the screenshot of what I'm seeing on my end" },
    { type: 'date', label: 'Today' },
    { type: 'out', author: 'Alex Morgan', via: 'WhatsApp', time: '9:14 AM', text: "Morning Maria! I just chased the carrier — your package was scanned into UPS Oakland hub at 7:22 AM. ETA is now Thursday. Sending you the updated tracking now.", status: 'read' },
    { type: 'out', author: 'Alex Morgan', via: 'WhatsApp', time: '9:14 AM', kind: 'file', fileName: 'tracking-1Z9X4F-update.pdf', fileSize: '124 KB', status: 'read' },
    { type: 'in', author: 'Maria Lopez', time: '9:21 AM', text: 'Perfect, thank you so much! ☀️' },
    { type: 'in', author: 'Maria Lopez', time: '9:22 AM', text: 'One more thing — can I add a gift note to the order before it arrives, or is it too late?' },
    { type: 'in', author: 'Maria Lopez', time: '9:22 AM', text: "It's for my sister's birthday on Friday." },
  ],
  notes: [
    { author: 'Sara Chen', time: 'Yesterday · 4:30 PM', text: 'Customer is VIP — last 3 orders shipped late. Comp shipping if she asks. @alex you good to take this?' },
    { author: 'Alex Morgan', time: 'Today · 9:10 AM', text: 'Spoke to UPS — package was just delayed at sort facility, not lost. Offering 20% off her next order as a goodwill gesture.' },
  ],
  history: [
    { channel: 'whatsapp', title: 'Refund processed — Order #4288', time: 'Apr 12, 2026', agent: 'Sara Chen' },
    { channel: 'instagram', title: 'Product question — matte black variant', time: 'Mar 8, 2026', agent: 'Tom Patel' },
    { channel: 'email', title: 'Welcome / onboarding', time: 'Mar 14, 2023', agent: 'System' },
  ],
};

// Dashboard data
const STATS = {
  totalMessages: { value: 1847, inbound: 1290, outbound: 557, trend: 12.4 },
  unread:        { value: 42,   assigned: 28, unassigned: 14, trend: -8.2 },
  active:        { value: 186,  open: 142, snoozed: 44, trend: 4.1 },
  resolved:      { value: 73,   resolved: 68, escalated: 5, trend: 18.6 },
};

const VOLUME_BY_DAY = [
  { day: 'Mon', inbound: 142, outbound: 98 },
  { day: 'Tue', inbound: 168, outbound: 110 },
  { day: 'Wed', inbound: 195, outbound: 134 },
  { day: 'Thu', inbound: 188, outbound: 122 },
  { day: 'Fri', inbound: 245, outbound: 168 },
  { day: 'Sat', inbound: 132, outbound: 88 },
  { day: 'Sun', inbound: 98, outbound: 62 },
];

const RESPONSE_BY_MONTH = [
  { m: 'JAN', v: 14.2 }, { m: 'FEB', v: 12.8 }, { m: 'MAR', v: 11.4 },
  { m: 'APR', v: 13.1 }, { m: 'MAY', v: 9.8 },  { m: 'JUN', v: 8.6 },
  { m: 'JUL', v: 9.2 },  { m: 'AUG', v: 10.1 }, { m: 'SEP', v: 8.9 },
  { m: 'OCT', v: 7.6 },  { m: 'NOV', v: 8.3 },  { m: 'DEC', v: 7.1 },
];

const CHANNEL_REGIONS = [
  { id: 'whatsapp',  name: 'WhatsApp',  color: '#25D366', pct: 52 },
  { id: 'instagram', name: 'Instagram', color: '#DD2A7B', pct: 23 },
  { id: 'webchat',   name: 'Webchat',   color: '#068B78', pct: 14 },
  { id: 'messenger', name: 'Messenger', color: '#0084FF', pct: 8 },
  { id: 'other',     name: 'Other',     color: '#9CA3AF', pct: 3 },
];

const MAP_BUBBLES = [
  { x: 245, y: 110, r: 22, ch: 'whatsapp',  country: 'Spain',      count: 184 },
  { x: 195, y: 95,  r: 18, ch: 'webchat',   country: 'UK',         count: 142 },
  { x: 230, y: 100, r: 14, ch: 'instagram', country: 'France',     count: 96 },
  { x: 145, y: 130, r: 26, ch: 'whatsapp',  country: 'USA',        count: 312 },
  { x: 165, y: 165, r: 16, ch: 'messenger', country: 'Mexico',     count: 102 },
  { x: 215, y: 220, r: 20, ch: 'whatsapp',  country: 'Brazil',     count: 228 },
  { x: 285, y: 180, r: 12, ch: 'instagram', country: 'Nigeria',    count: 64 },
  { x: 325, y: 145, r: 14, ch: 'webchat',   country: 'India',      count: 88 },
  { x: 380, y: 165, r: 11, ch: 'messenger', country: 'Indonesia',  count: 52 },
  { x: 360, y: 110, r: 13, ch: 'whatsapp',  country: 'China',      count: 74 },
  { x: 400, y: 230, r: 10, ch: 'webchat',   country: 'Australia',  count: 44 },
];

const AGENT_PERF = [
  { id: 'sara',  name: 'Sara Chen',     conv: 48, resp: 92, value: '4m 12s' },
  { id: 'tom',   name: 'Tom Patel',     conv: 42, resp: 80, value: '5m 48s' },
  { id: 'maya',  name: 'Maya Williams', conv: 38, resp: 76, value: '6m 02s' },
  { id: 'devon', name: 'Devon Reyes',   conv: 34, resp: 85, value: '4m 51s' },
  { id: 'priya', name: 'Priya Kapoor',  conv: 28, resp: 65, value: '8m 14s' },
  { id: 'me',    name: 'Alex Morgan',   conv: 22, resp: 88, value: '4m 02s' },
];

const CHANNEL_MIX = [
  { id: 'whatsapp',  name: 'WhatsApp',  color: '#25D366', value: 98 },
  { id: 'instagram', name: 'Instagram', color: '#DD2A7B', value: 43 },
  { id: 'webchat',   name: 'Webchat',   color: '#068B78', value: 26 },
  { id: 'messenger', name: 'Messenger', color: '#0084FF', value: 15 },
  { id: 'email',     name: 'Email',     color: '#F97316', value: 4 },
];

const LATEST_ACTIVITY = [
  { channel: 'whatsapp',  title: 'New WhatsApp from Maria Lopez', sub: 'Order #4521 — needs refund info', time: 'Just now' },
  { channel: 'instagram', title: 'New comment on @yourbrand',     sub: '"Where can I order this in EU?"',    time: '6m' },
  { channel: 'webchat',   title: 'Live chat from Chris Bauer',    sub: 'Discount code WELCOME15 invalid',    time: '12m' },
  { channel: 'email',     title: 'Email from Hannah Reilly',      sub: 'Re: Invoice #INV-2024-0931',         time: '1h' },
  { channel: 'messenger', title: 'Yuki Tanaka resolved',          sub: 'Issue marked as resolved by Maya',   time: '34m ago' },
  { channel: 'linkedin',  title: 'Marcus Hale message',           sub: 'Interested in Enterprise plan',      time: 'Yesterday' },
];

const CHANNEL_UNREAD = {
  whatsapp: 14,
  messenger: 3,
  instagram: 8,
  tiktok: 2,
  linkedin: 1,
  webchat: 6,
  email: 4,
  sms: 2,
};

Object.assign(window, {
  CHANNELS, CHANNEL_LIST, AGENTS, CONTACT_TONES, CONVOS,
  ACTIVE_THREAD, STATS, VOLUME_BY_DAY, RESPONSE_BY_MONTH,
  CHANNEL_REGIONS, MAP_BUBBLES, AGENT_PERF, CHANNEL_MIX,
  LATEST_ACTIVITY, CHANNEL_UNREAD,
});
