const CONFIG = {
  GAME_DURATION: 60,
  GM_TARGET:     618221,
  KDDI_TARGET:   48976,
  TOTAL_TARGET:  667197,

  HUNTING_TRIGGER:      30,  // seconds elapsed when mini-game fires
  HUNTING_DURATION:     10,
  HUNTING_SIGNAL_COUNT: 8,
  HUNTING_BONUS:        5000, // GM per signal clicked

  REBOOT_DURATION: 3,
  MAX_REBOOTS:     4, // tombstone threshold

  PACING: {
    STEADY: {
      name: 'STEADY', shortName: 'STD',
      healthDrain: 1.5,  // % per second
      gmRate:      7500, // connections/sec
      kddiRate:    540,
      scrollSpeed: 60,   // px/sec for terrain scroll
      color:       '#00ff41'
    },
    AGGRESSIVE: {
      name: 'AGGRESSIVE', shortName: 'AGG',
      healthDrain: 4.0,
      gmRate:      13500,
      kddiRate:    980,
      scrollSpeed: 130,
      color:       '#ffe600'
    },
    OVERDRIVE: {
      name: 'MAX OVERDRIVE', shortName: 'OVR',
      healthDrain: 11.0,
      gmRate:      22000,
      kddiRate:    1600,
      scrollSpeed: 220,
      color:       '#ff4444'
    }
  },

  PACING_LEVELS: ['STEADY', 'AGGRESSIVE', 'OVERDRIVE'],

  // Dates for the 60-second timeline  (Jan 2024 → Oct 2026)
  TIMELINE_MONTHS: 33, // months total
  TIMELINE_START:  'JAN 2024',
  TIMELINE_END:    'OCT 2026',

  MONTH_NAMES: ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'],

  MILESTONES: [
    { pct: 0.15, label: 'JAN 2024', gm:  25000, kddi:    0 },
    { pct: 0.30, label: 'DEC 2024', gm: 198239, kddi: 14604 },
    { pct: 0.50, label: 'JUL 2026', gm: 523028, kddi: 41055 },
    { pct: 0.65, label: 'AUG 2026', gm: 571810, kddi: 43780 },
    { pct: 0.82, label: 'OCT 2026', gm: 618221, kddi: 48976 }
  ],

  EVENTS: [
    {
      id: 'ota',
      title: '!! OTA UPDATE CORRUPTED !!',
      desc: 'Firmware package failed signature check on 847 vehicles.',
      options: [
        {
          key: 'A', label: '[A] ROLLBACK FIRMWARE',
          desc: 'Safe revert. Lose 5% fleet health.',
          resolve(s) {
            s.health = Math.max(0, s.health - 5);
            return { msg: 'ROLLBACK COMPLETE. Health -5%.', good: true };
          }
        },
        {
          key: 'B', label: '[B] FORCE PUSH UPDATE',
          desc: 'Risky. 50/50: +12K GM bonus OR health -20%.',
          resolve(s) {
            if (Math.random() < 0.5) {
              s.gmConnections += 12000;
              return { msg: 'PUSH SUCCEEDED! +12,000 GM CONNECTIONS!', good: true };
            }
            s.health = Math.max(0, s.health - 20);
            return { msg: 'PUSH FAILED. Fleet health -20%.', good: false };
          }
        }
      ],
      worstCase(s) {
        s.health = Math.max(0, s.health - 20);
        return { msg: 'NO RESPONSE. PUSH FAILED. Health -20%.', good: false };
      }
    },
    {
      id: 'tower',
      title: '!! SIGNAL TOWER OUTAGE !!',
      desc: 'Primary relay tower offline. 2,300 vehicles orphaned.',
      options: [
        {
          key: 'A', label: '[A] REROUTE TRAFFIC',
          desc: 'Safe reroute. -10,000 GM connections.',
          resolve(s) {
            s.gmConnections = Math.max(0, s.gmConnections - 10000);
            return { msg: 'REROUTED SUCCESSFULLY. -10,000 GM connections.', good: true };
          }
        },
        {
          key: 'B', label: '[B] FORCE DIRECT CONNECT',
          desc: 'Risky. 60% OK, 40% chance of -25K connections.',
          resolve(s) {
            if (Math.random() < 0.6) {
              return { msg: 'DIRECT CONNECT HELD. No loss.', good: true };
            }
            s.gmConnections = Math.max(0, s.gmConnections - 25000);
            return { msg: 'CONNECTION DROPPED. -25,000 GM connections.', good: false };
          }
        }
      ],
      worstCase(s) {
        s.gmConnections = Math.max(0, s.gmConnections - 25000);
        return { msg: 'TIMEOUT. CONNECTION DROPPED. -25,000 GM.', good: false };
      }
    },
    {
      id: 'spectrum',
      title: '!! 5G BAND INTERFERENCE !!',
      desc: 'Adjacent carrier causing KDDI packet loss on C-band.',
      options: [
        {
          key: 'A', label: '[A] ENGAGE SHIELD MODE',
          desc: 'Safe. KDDI protected for 10s. Health -5%.',
          resolve(s) {
            s.health = Math.max(0, s.health - 5);
            s.shieldActive = true; s.shieldTimer = 10;
            return { msg: 'SHIELD ACTIVE. KDDI protected for 10s.', good: true };
          }
        },
        {
          key: 'B', label: '[B] POWER THROUGH',
          desc: 'Risky. 50%: 1.5x KDDI boost OR health -15%.',
          resolve(s) {
            if (Math.random() < 0.5) {
              s.kddiBoost = 1.5; s.kddiBoostTimer = 8;
              return { msg: 'POWER SURGE! 1.5x KDDI BOOST for 8 seconds!', good: true };
            }
            s.health = Math.max(0, s.health - 15);
            return { msg: 'OVERLOAD. Health -15%.', good: false };
          }
        }
      ],
      worstCase(s) {
        s.health = Math.max(0, s.health - 15);
        return { msg: 'TIMEOUT. SYSTEM OVERLOAD. Health -15%.', good: false };
      }
    },
    {
      id: 'audit',
      title: '!! SPECTRUM AUDIT ALERT !!',
      desc: 'Regulatory audit flag on KDDI spectrum license.',
      options: [
        {
          key: 'A', label: '[A] FILE EXTENSION',
          desc: 'Safe. Pause KDDI growth 5s to avoid penalty.',
          resolve(s) {
            s.kddiPaused = true; s.kddiPausedTimer = 5;
            return { msg: 'EXTENSION FILED. KDDI growth paused 5s.', good: true };
          }
        },
        {
          key: 'B', label: '[B] CONTEST RULING',
          desc: 'Risky. 40%: +20K KDDI, 60%: health -10% & KDDI -10K.',
          resolve(s) {
            if (Math.random() < 0.4) {
              s.kddiConnections += 20000;
              return { msg: 'RULING OVERTURNED! +20,000 KDDI!', good: true };
            }
            s.health = Math.max(0, s.health - 10);
            s.kddiConnections = Math.max(0, s.kddiConnections - 10000);
            return { msg: 'RULING UPHELD. Health -10%, KDDI -10K.', good: false };
          }
        }
      ],
      worstCase(s) {
        s.health = Math.max(0, s.health - 10);
        s.kddiConnections = Math.max(0, s.kddiConnections - 10000);
        return { msg: 'NO RESPONSE. PENALTY APPLIED.', good: false };
      }
    }
  ],

  RANKINGS: [
    { label: 'ELITE PIONEER',   color: '#00ff88', condition: (gm, kddi) => gm >= 618221 && kddi >= 48976 },
    { label: 'TRAIL BLAZER',    color: '#ffe600', condition: (gm, kddi) => gm >= 400000 && kddi >= 30000 },
    { label: 'SIGNAL SEEKER',   color: '#ff9f00', condition: (gm, kddi) => gm >= 200000 },
    { label: 'DESERT WALKER',   color: '#ff4444', condition: (gm, kddi) => gm >= 50000 },
    { label: 'LOST IN STATIC',  color: '#ff2244', condition: ()          => true }
  ]
};
