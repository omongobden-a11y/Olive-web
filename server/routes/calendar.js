const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET /api/calendar/feed.ics - RFC 5545 iCalendar feed
router.get('/feed.ics', (req, res) => {
  try {
    const events = db.prepare('SELECT * FROM events WHERE is_published = 1 ORDER BY date_str ASC;').all();
    
    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Olive Nursery and Primary School - Atapara//School Calendar 1.0//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Olive School - Atapara Academic Calendar',
      'X-WR-TIMEZONE:Africa/Kampala'
    ];

    for (const ev of events) {
      // Parse YYYY-MM-DD
      const dateParts = ev.date_str.split('-');
      if (dateParts.length === 3) {
        const dateFormatted = dateParts.join('');
        const uid = `ev-${ev.id}@oliveatapara.ac.ug`;
        const summary = (ev.title || '').replace(/[,;\\]/g, '\\$&');
        const desc = (ev.details || '').replace(/[,;\\]/g, '\\$&');

        ics.push(
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
          `DTSTART;VALUE=DATE:${dateFormatted}`,
          `SUMMARY:${summary}`,
          `DESCRIPTION:${desc}`,
          'LOCATION:Olive Nursery and Primary School - Atapara\\, Kamdini\\, Oyam District',
          'STATUS:CONFIRMED',
          'END:VEVENT'
        );
      }
    }

    ics.push('END:VCALENDAR');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="olive-atapara-calendar.ics"');
    res.send(ics.join('\r\n'));
  } catch (err) {
    console.error('Error generating ics calendar:', err);
    res.status(500).send('Error generating calendar feed');
  }
});

module.exports = router;
