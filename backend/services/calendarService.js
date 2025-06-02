const { google } = require('googleapis');
const User = require('../models/User');
const Group = require('../models/Group');
const Call = require('../models/Call');

class CalendarService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  // Get Google Calendar API client
  async getCalendarClient(userId) {
    const user = await User.findById(userId);
    if (!user.calendarToken) {
      throw new Error('Calendar not connected');
    }

    this.oauth2Client.setCredentials({
      access_token: user.calendarToken
    });

    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  // Connect user's Google Calendar
  async connectCalendar(userId, code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    await User.findByIdAndUpdate(userId, {
      calendarToken: tokens.access_token,
      calendarRefreshToken: tokens.refresh_token,
      calendarTokenExpiry: new Date(tokens.expiry_date)
    });
  }

  // Create calendar event
  async createEvent(userId, eventData) {
    const calendar = await this.getCalendarClient(userId);
    const event = {
      summary: eventData.title,
      description: eventData.description,
      start: {
        dateTime: eventData.startTime,
        timeZone: eventData.timeZone || 'UTC'
      },
      end: {
        dateTime: eventData.endTime,
        timeZone: eventData.timeZone || 'UTC'
      },
      attendees: eventData.attendees,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 }
        ]
      }
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event
    });

    return response.data;
  }

  // Schedule a call and create calendar event
  async scheduleCallWithCalendar(userId, callData) {
    const call = await Call.create({
      ...callData,
      initiator: userId
    });

    const eventData = {
      title: `Call: ${callData.title}`,
      description: callData.description,
      startTime: callData.startTime,
      endTime: new Date(callData.startTime.getTime() + callData.duration * 1000),
      attendees: callData.participants.map(p => ({ email: p.email })),
      timeZone: callData.timeZone
    };

    const event = await this.createEvent(userId, eventData);
    call.calendarEventId = event.id;
    await call.save();

    return { call, event };
  }

  // Get user's calendar events
  async getEvents(userId, timeMin, timeMax) {
    const calendar = await this.getCalendarClient(userId);
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    return response.data.items;
  }

  // Update calendar event
  async updateEvent(userId, eventId, eventData) {
    const calendar = await this.getCalendarClient(userId);
    const event = {
      summary: eventData.title,
      description: eventData.description,
      start: {
        dateTime: eventData.startTime,
        timeZone: eventData.timeZone || 'UTC'
      },
      end: {
        dateTime: eventData.endTime,
        timeZone: eventData.timeZone || 'UTC'
      },
      attendees: eventData.attendees
    };

    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId,
      resource: event
    });

    return response.data;
  }

  // Delete calendar event
  async deleteEvent(userId, eventId) {
    const calendar = await this.getCalendarClient(userId);
    await calendar.events.delete({
      calendarId: 'primary',
      eventId
    });
  }

  // Sync group events with calendar
  async syncGroupEvents(groupId) {
    const group = await Group.findById(groupId);
    const events = [];

    for (const member of group.members) {
      const userEvents = await this.getEvents(
        member.user,
        new Date(),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );
      events.push(...userEvents);
    }

    return events;
  }

  // Refresh calendar token
  async refreshToken(userId) {
    const user = await User.findById(userId);
    if (!user.calendarRefreshToken) {
      throw new Error('No refresh token available');
    }

    this.oauth2Client.setCredentials({
      refresh_token: user.calendarRefreshToken
    });

    const { tokens } = await this.oauth2Client.refreshAccessToken();
    await User.findByIdAndUpdate(userId, {
      calendarToken: tokens.access_token,
      calendarTokenExpiry: new Date(tokens.expiry_date)
    });

    return tokens;
  }
}

module.exports = new CalendarService(); 