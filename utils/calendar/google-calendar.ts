import { google } from 'googleapis';
import { authenticate } from '@google-cloud/local-auth';
import { join } from 'path';
import { readFile, writeFile } from 'fs/promises';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = join(process.cwd(), 'credentials.json');

async function loadSavedCredentialsIfExist() {
  try {
    const content = await readFile(TOKEN_PATH);
    const credentials = JSON.parse(content.toString());
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client) {
  const content = await readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content.toString());
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await writeFile(TOKEN_PATH, payload);
}

async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

export async function createCalendarEvent(summary, description, startDateTime, endDateTime) {
  const auth = await authorize();
  const calendar = google.calendar({ version: 'v3', auth });
  const event = {
    summary,
    description,
    start: {
      dateTime: startDateTime,
      timeZone: 'UTC',
    },
    end: {
      dateTime: endDateTime,
      timeZone: 'UTC',
    },
  };

  try {
    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });
    return res.data;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}