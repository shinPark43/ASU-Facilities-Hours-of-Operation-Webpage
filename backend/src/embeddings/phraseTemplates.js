'use strict';

function slugify(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// Convert "X - Y" separator to "X to Y" for natural-language phrases
function toRange(value) {
  return typeof value === 'string' ? value.replace(' - ', ' to ') : value;
}

// Library: sections[name][day] = "HH:MM - HH:MM" | "Closed" | "Hours not available"
function libraryPhrases(facilityData) {
  const phrases = [];
  if (!facilityData || !facilityData.sections) return phrases;
  for (const [sectionName, days] of Object.entries(facilityData.sections)) {
    for (const [day, value] of Object.entries(days)) {
      const id = `library_${slugify(sectionName)}_${slugify(day)}`;
      let text;
      if (!value || value === 'Closed') {
        text = `Porter Henderson Library ${sectionName} is closed on ${day}.`;
      } else {
        text = `Porter Henderson Library ${sectionName} is open from ${toRange(value)} on ${day}.`;
      }
      phrases.push({ id, text });
    }
  }
  return phrases;
}

// Recreation: sections[name][day] = "HH:MM - HH:MM" | "Closed" | "Hours not available"
function recreationPhrases(facilityData) {
  const phrases = [];
  if (!facilityData || !facilityData.sections) return phrases;
  for (const [sectionName, days] of Object.entries(facilityData.sections)) {
    for (const [day, value] of Object.entries(days)) {
      const id = `recreation_${slugify(sectionName)}_${slugify(day)}`;
      let text;
      if (!value || value === 'Closed') {
        text = `The ASU Recreation Center ${sectionName} is closed on ${day}.`;
      } else {
        text = `The ASU Recreation Center ${sectionName} is open from ${toRange(value)} on ${day}.`;
      }
      phrases.push({ id, text });
    }
  }
  return phrases;
}

// Dining: sections[name][day] = "HH:MM - HH:MM" | "Closed" | "Hours not available"
function diningPhrases(facilityData) {
  const phrases = [];
  if (!facilityData || !facilityData.sections) return phrases;
  for (const [sectionName, days] of Object.entries(facilityData.sections)) {
    for (const [day, value] of Object.entries(days)) {
      const id = `dining_${slugify(sectionName)}_${slugify(day)}`;
      let text;
      if (!value || value === 'Closed') {
        text = `The ${sectionName} dining location is closed on ${day}.`;
      } else {
        text = `The ${sectionName} dining location is open from ${toRange(value)} on ${day}.`;
      }
      phrases.push({ id, text });
    }
  }
  return phrases;
}

// Ram Tram: sections[name][day] = "HH:MM - HH:MM" | "Closed" | { time, route } | "Hours not available"
function ramTramPhrases(facilityData) {
  const phrases = [];
  if (!facilityData || !facilityData.sections) return phrases;
  for (const [sectionName, days] of Object.entries(facilityData.sections)) {
    for (const [day, value] of Object.entries(days)) {
      const sectionSlug = slugify(sectionName);
      const facilitySlug = 'ram_tram';
      const idSection = sectionSlug === facilitySlug ? '' : `_${sectionSlug}`;
      const id = `ram_tram${idSection}_${slugify(day)}`;
      let text;
      if (!value || value === 'Closed') {
        text = `The Ram Tram ${sectionName} does not run on ${day}.`;
      } else if (typeof value === 'object' && value.time) {
        const routePart = value.route ? ` ${value.route}` : ` ${sectionName}`;
        text = `The Ram Tram${routePart} runs on ${day} from ${toRange(value.time)}.`;
      } else {
        text = `The Ram Tram ${sectionName} runs on ${day} from ${toRange(value)}.`;
      }
      phrases.push({ id, text });
    }
  }
  return phrases;
}

// Tutoring: { subjects: { name: { courses: { name: { code, sessions: [{day, time, location, is_online, is_tba}] } } } } }
function tutoringPhrases(tutoringData) {
  const phrases = [];
  if (!tutoringData || !tutoringData.subjects) return phrases;

  for (const [subjectName, subject] of Object.entries(tutoringData.subjects)) {
    for (const [, course] of Object.entries(subject.courses || {})) {
      const displayCode = course.code || course.name;
      const codeSlug = slugify(displayCode);

      if (course.has_online) {
        phrases.push({
          id: `tutoring_${codeSlug}_online`,
          text: `${displayCode} tutoring (${course.name}) is available online through Upswing.`,
        });
      }

      const sessions = course.sessions || [];
      sessions.forEach((session, idx) => {
        if (session.is_tba || session.day === 'TBA') {
          phrases.push({
            id: `tutoring_${codeSlug}_tba_${idx}`,
            text: `${displayCode} tutoring schedule is to be announced (TBA).`,
          });
        } else if (session.is_online) {
          // covered by has_online phrase above
        } else {
          const id = `tutoring_${codeSlug}_${slugify(session.day)}_${idx}`;
          let text;
          if (session.location) {
            text = `${subjectName} tutoring for ${displayCode} (${course.name}) is available on ${session.day} from ${session.time} at ${session.location}.`;
          } else {
            text = `${subjectName} tutoring for ${displayCode} (${course.name}) is available on ${session.day} from ${session.time}.`;
          }
          phrases.push({ id, text });
        }
      });
    }
  }

  return phrases;
}

// Calendar: [{ date, title, badge, accentColor }]
function calendarPhrases(events) {
  const phrases = [];
  if (!Array.isArray(events)) return phrases;
  for (const event of events) {
    const id = `calendar_${slugify(event.title)}`;
    let text;
    const badge = event.badge;
    if (badge === 'DEADLINE') {
      text = `The academic deadline '${event.title}' is on ${event.date}.`;
    } else if (badge === 'BREAK') {
      text = `${event.title} runs on ${event.date}.`;
    } else if (badge === 'EXAM') {
      text = `${event.title} are scheduled for ${event.date}.`;
    } else {
      text = `${event.title} is scheduled for ${event.date}.`;
    }
    phrases.push({ id, text });
  }
  return phrases;
}

// Events: [{ id, title, date, time, location }]
function eventsPhrases(events) {
  const phrases = [];
  if (!Array.isArray(events)) return phrases;
  for (const event of events) {
    const id = `event_${event.id}`;
    let text;
    if (event.location) {
      text = `${event.title} is happening at ${event.location} on ${event.date}`;
      if (event.time && event.time !== 'All Day') {
        text += ` from ${event.time}`;
      }
      text += '.';
    } else {
      text = `${event.title} is scheduled for ${event.date}`;
      if (event.time && event.time !== 'All Day') {
        text += ` from ${event.time}`;
      }
      text += '.';
    }
    phrases.push({ id, text });
  }
  return phrases;
}

module.exports = {
  libraryPhrases,
  recreationPhrases,
  diningPhrases,
  ramTramPhrases,
  tutoringPhrases,
  calendarPhrases,
  eventsPhrases,
};
